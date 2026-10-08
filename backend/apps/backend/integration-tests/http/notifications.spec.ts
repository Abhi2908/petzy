import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows"
import { medusaIntegrationTestRunner, TestEventUtils } from "@medusajs/test-utils"
import { INSURANCE_EVENTS } from "../../src/modules/insurance/events"
import { MATES_EVENTS } from "../../src/modules/mates/events"
import { VET_MODULE } from "../../src/modules/vet"
import { VET_EVENTS } from "../../src/modules/vet/events"
import VetModuleService from "../../src/modules/vet/service"
import { TEMPLATES } from "../../src/notifications/templates"

jest.setTimeout(120_000)

const PASSWORD = "Test-password-123"
const SELLER_PHONE = "+91 98111 00001"
const BUYER_PHONE = "+91 98222 00002"
const OTHER_PHONE = "+91 98333 00003"
const ALL_PHONES = [SELLER_PHONE, BUYER_PHONE, OTHER_PHONE]

type Api = {
  get: (url: string, config?: unknown) => Promise<{ status: number; data: any }>
  post: (url: string, body?: unknown, config?: unknown) => Promise<{ status: number; data: any }>
}
type Headers = { headers: Record<string, string> }
type Sent = { to: string; template: string; content: { subject: string; html: string; text: string } }

async function registerCustomer(api: Api, key: string, email: string): Promise<Headers & { id: string }> {
  const store = { "x-publishable-api-key": key }
  const registered = await api.post("/auth/customer/emailpass/register", { email, password: PASSWORD })
  await api.post("/store/customers", { email }, { headers: { ...store, authorization: `Bearer ${registered.data.token}` } })
  const login = await api.post("/auth/customer/emailpass", { email, password: PASSWORD })
  const headers = { ...store, authorization: `Bearer ${login.data.token}` }
  const me = await api.get("/store/customers/me", { headers })
  return { headers, id: me.data.customer.id }
}

async function registerAdmin(api: Api, container: MedusaContainer): Promise<Headers> {
  const email = "admin@notify.test"
  const registered = await api.post("/auth/user/emailpass/register", { email, password: PASSWORD })
  const payload = JSON.parse(Buffer.from(registered.data.token.split(".")[1], "base64url").toString())
  await createUserAccountWorkflow(container).run({ input: { authIdentityId: payload.auth_identity_id, userData: { email } } })
  const login = await api.post("/auth/user/emailpass", { email, password: PASSWORD })
  return { headers: { authorization: `Bearer ${login.data.token}` } }
}

const flat = (s: string) => s.replace(/[\s-]/g, "")
const emailText = (n: Sent) => `${n.content.subject}\n${n.content.html}\n${n.content.text}`

/** Fails when any phone number (other than the allowed ones) appears in the email. */
function expectNoPhones(n: Sent, allowed: string[] = []) {
  for (const phone of ALL_PHONES.filter((p) => !allowed.includes(p))) {
    expect(flat(emailText(n))).not.toContain(flat(phone))
  }
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let admin: Headers
    let store: Headers
    let key: string
    let spy: jest.SpyInstance
    const sent = (template?: string) =>
      spy.mock.calls.map((c) => c[0] as Sent).filter((n) => !template || n.template === template)

    /** Runs an action and waits until the subscribers of the event it emits have finished. */
    async function andWait(eventName: string, action: () => Promise<unknown>): Promise<{ status: number; data: any }> {
      const done = TestEventUtils.waitSubscribersExecution(eventName, getContainer().resolve(Modules.EVENT_BUS))
      const result = (await action()) as { status: number; data: any }
      await done
      return result
    }

    beforeEach(async () => {
      const container = getContainer()
      const apiKey = await container.resolve(Modules.API_KEY).createApiKeys({ title: "Notify tests", type: "publishable", created_by: "test" })
      key = apiKey.token
      store = { headers: { "x-publishable-api-key": key } }
      admin = await registerAdmin(api, container)
      spy = jest.spyOn(container.resolve(Modules.NOTIFICATION), "createNotifications")
    })

    afterEach(() => {
      spy.mockRestore()
      for (const name of ["NOTIFY_MATES", "NOTIFY_VET", "ADMIN_NOTIFY_EMAIL"]) {
        delete process.env[name]
      }
    })

    describe("vet", () => {
      async function bookableSlot(providerEmail: string | null) {
        const provider = await api.post(
          "/admin/vet/providers",
          {
            name: "Dr. Test",
            clinic_name: "Test Clinic",
            city: "Pune",
            phone: "+91 90000 00001",
            email: providerEmail,
            consultation_fee: 500,
            slot_minutes: 30,
            working_hours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start_time: "09:00", end_time: "12:00" })),
          },
          admin
        )
        const id = provider.data.provider.id
        const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() + 86_400_000))
        const slots = await api.get(`/store/vet/providers/${id}/slots?date=${tomorrow}`, store)
        return { providerId: id, slots: slots.data.slots as { starts_at: string }[] }
      }

      const booking = (providerId: string, startsAt: string, email: string | null) => ({
        provider_id: providerId,
        starts_at: startsAt,
        customer_name: "Asha Rao",
        customer_phone: "+91 98765 43210",
        customer_email: email,
        pet_name: "Bruno",
        pet_type: "dog",
      })

      it("emails the customer and the clinic when a slot is booked, and both again when it is cancelled", async () => {
        const { providerId, slots } = await bookableSlot("clinic@example.com")
        const res = await andWait(VET_EVENTS.APPOINTMENT_BOOKED, () =>
          api.post("/store/vet/appointments", booking(providerId, slots[0].starts_at, "asha@example.com"), store)
        )
        const [toCustomer] = sent(TEMPLATES.VET_BOOKED_CUSTOMER)
        expect(toCustomer.to).toBe("asha@example.com")
        expect(toCustomer.content.text).toContain("Pay Rs 500 at the clinic")
        expect(toCustomer.content.text).toMatch(/Date and time: \w{3}, \d{1,2} \w{3} \d{4}, 9:00 am IST/)
        expect(sent(TEMPLATES.VET_BOOKED_PROVIDER).map((n) => n.to)).toEqual(["clinic@example.com"])

        // Confirming sends nothing; cancelling emails both.
        const id = res.data.appointment.id
        await andWait(VET_EVENTS.APPOINTMENT_UPDATED, () => api.post(`/admin/vet/appointments/${id}`, { status: "confirmed" }, admin))
        expect(sent(TEMPLATES.VET_CANCELLED_CUSTOMER)).toHaveLength(0)
        await andWait(VET_EVENTS.APPOINTMENT_UPDATED, () => api.post(`/admin/vet/appointments/${id}`, { status: "cancelled" }, admin))
        expect(sent(TEMPLATES.VET_CANCELLED_CUSTOMER).map((n) => n.to)).toEqual(["asha@example.com"])
        expect(sent(TEMPLATES.VET_CANCELLED_PROVIDER).map((n) => n.to)).toEqual(["clinic@example.com"])
        // Saving notes on an already cancelled appointment does not send it again.
        await andWait(VET_EVENTS.APPOINTMENT_UPDATED, () => api.post(`/admin/vet/appointments/${id}`, { notes: "Rebook" }, admin))
        expect(sent(TEMPLATES.VET_CANCELLED_CUSTOMER)).toHaveLength(1)
      })

      it("skips the customer email when no email was given", async () => {
        const { providerId, slots } = await bookableSlot("clinic@example.com")
        await andWait(VET_EVENTS.APPOINTMENT_BOOKED, () => api.post("/store/vet/appointments", booking(providerId, slots[0].starts_at, null), store))
        expect(sent(TEMPLATES.VET_BOOKED_CUSTOMER)).toHaveLength(0)
        expect(sent(TEMPLATES.VET_BOOKED_PROVIDER)).toHaveLength(1)
      })

      it("never fails the booking when sending fails", async () => {
        spy.mockRejectedValue(new Error("Resend refused the email (500)"))
        const { providerId, slots } = await bookableSlot("clinic@example.com")
        const res = await andWait(VET_EVENTS.APPOINTMENT_BOOKED, () =>
          api.post("/store/vet/appointments", booking(providerId, slots[0].starts_at, "asha@example.com"), store)
        )
        expect(res.status).toBe(201)
        expect(spy).toHaveBeenCalledTimes(2)
        const vet: VetModuleService = getContainer().resolve(VET_MODULE)
        expect((await vet.retrieveVetAppointment(res.data.appointment.id)).status).toBe("booked")
      })

      it("sends nothing when vet notifications are switched off", async () => {
        process.env.NOTIFY_VET = "false"
        const { providerId, slots } = await bookableSlot("clinic@example.com")
        await andWait(VET_EVENTS.APPOINTMENT_BOOKED, () =>
          api.post("/store/vet/appointments", booking(providerId, slots[0].starts_at, "asha@example.com"), store)
        )
        expect(spy).not.toHaveBeenCalled()
      })
    })

    describe("mates", () => {
      const listingBody = (overrides: Record<string, unknown> = {}) => ({
        title: "Beagle puppy (test)",
        pet_type: "cat",
        breed: "Indie",
        gender: "male",
        age_months: 3,
        price: 20000,
        price_negotiable: true,
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
        seller_phone: SELLER_PHONE,
        ...overrides,
      })

      it("emails the seller when Admin approves or rejects a listing", async () => {
        const seller = await registerCustomer(api, key, "seller@notify.test")
        const a = (await api.post("/store/mates/listings", listingBody(), seller)).data.listing.id
        const b = (await api.post("/store/mates/listings", listingBody({ title: "Second (test)" }), seller)).data.listing.id
        await andWait(MATES_EVENTS.LISTING_MODERATED, () => api.post(`/admin/mates/listings/${a}/approve`, {}, admin))
        await andWait(MATES_EVENTS.LISTING_MODERATED, () => api.post(`/admin/mates/listings/${b}/reject`, { reason: "Add a clear photo" }, admin))

        const [approved] = sent(TEMPLATES.MATES_LISTING_APPROVED)
        expect(approved).toMatchObject({ to: "seller@notify.test" })
        const [rejected] = sent(TEMPLATES.MATES_LISTING_REJECTED)
        expect(rejected.to).toBe("seller@notify.test")
        expect(rejected.content.text).toContain("Reason: Add a clear photo")
        for (const n of sent()) {
          expectNoPhones(n)
        }
      })

      it("runs the offer flow: offer, counter, messages, accept with phones, and closes the other buyer", async () => {
        const seller = await registerCustomer(api, key, "seller@notify.test")
        const buyer = await registerCustomer(api, key, "buyer@notify.test")
        const other = await registerCustomer(api, key, "other@notify.test")
        const id = (await api.post("/store/mates/listings", listingBody({ title: `Beagle, call ${SELLER_PHONE}` }), seller)).data.listing.id
        await andWait(MATES_EVENTS.LISTING_MODERATED, () => api.post(`/admin/mates/listings/${id}/approve`, {}, admin))

        const offer = await andWait(MATES_EVENTS.OFFER_CREATED, () =>
          api.post(`/store/mates/listings/${id}/offers`, { amount: 15000, buyer_phone: BUYER_PHONE }, buyer)
        )
        const offerId = offer.data.offer.id
        await andWait(MATES_EVENTS.OFFER_CREATED, () =>
          api.post(`/store/mates/listings/${id}/offers`, { amount: 14000, buyer_phone: OTHER_PHONE }, other)
        )
        expect(sent(TEMPLATES.MATES_OFFER_RECEIVED).map((n) => n.to)).toEqual(["seller@notify.test", "seller@notify.test"])

        await andWait(MATES_EVENTS.OFFER_UPDATED, () => api.post(`/store/mates/offers/${offerId}/counter`, { amount: 18000 }, seller))
        const [countered] = sent(TEMPLATES.MATES_OFFER_COUNTERED)
        expect(countered.to).toBe("buyer@notify.test")
        expect(countered.content.text).toContain("Rs 18,000")

        // A buyer's message emails the seller, with the typed number hidden; the seller's reply sends nothing.
        await andWait(MATES_EVENTS.MESSAGE_CREATED, () =>
          api.post(`/store/mates/offers/${offerId}/messages`, { body: `Call me on ${BUYER_PHONE}` }, buyer)
        )
        await andWait(MATES_EVENTS.MESSAGE_CREATED, () => api.post(`/store/mates/offers/${offerId}/messages`, { body: "Sure" }, seller))
        const messages = sent(TEMPLATES.MATES_MESSAGE_RECEIVED)
        expect(messages.map((n) => n.to)).toEqual(["seller@notify.test"])
        expect(messages[0].content.text).toContain("Call me on [number hidden]")

        // Every email so far is phone-free, including the typed numbers in the title and the message.
        for (const n of sent()) {
          expectNoPhones(n)
        }

        // The buyer accepts the counter: both sides get the other's phone, the other buyer is told it closed.
        spy.mockClear()
        await andWait(MATES_EVENTS.OFFER_UPDATED, () => api.post(`/store/mates/offers/${offerId}/accept`, {}, buyer))
        const accepted = sent(TEMPLATES.MATES_OFFER_ACCEPTED)
        expect(accepted.map((n) => n.to).sort()).toEqual(["buyer@notify.test", "seller@notify.test"])
        const toBuyer = accepted.find((n) => n.to === "buyer@notify.test")!
        const toSeller = accepted.find((n) => n.to === "seller@notify.test")!
        expect(toBuyer.content.text).toContain(`Call the seller to arrange the handover: ${SELLER_PHONE}`)
        expectNoPhones(toBuyer, [SELLER_PHONE])
        expect(toSeller.content.text).toContain(`Call the buyer to arrange the handover: ${BUYER_PHONE}`)
        expectNoPhones(toSeller, [BUYER_PHONE])
        const closed = sent(TEMPLATES.MATES_OFFER_REJECTED)
        expect(closed.map((n) => n.to)).toEqual(["other@notify.test"])
        expect(closed[0].content.text).toContain("accepted another buyer's offer")
        expectNoPhones(closed[0])
      })

      it("emails the buyer when the seller rejects, and nothing for buyer moves", async () => {
        const seller = await registerCustomer(api, key, "seller@notify.test")
        const buyer = await registerCustomer(api, key, "buyer@notify.test")
        const id = (await api.post("/store/mates/listings", listingBody(), seller)).data.listing.id
        await andWait(MATES_EVENTS.LISTING_MODERATED, () => api.post(`/admin/mates/listings/${id}/approve`, {}, admin))
        const first = (await andWait(MATES_EVENTS.OFFER_CREATED, () =>
          api.post(`/store/mates/listings/${id}/offers`, { amount: 15000, buyer_phone: BUYER_PHONE }, buyer)
        )).data.offer.id
        await andWait(MATES_EVENTS.OFFER_UPDATED, () => api.post(`/store/mates/offers/${first}/withdraw`, {}, buyer))
        expect(sent(TEMPLATES.MATES_OFFER_REJECTED)).toHaveLength(0)

        const second = (await andWait(MATES_EVENTS.OFFER_CREATED, () =>
          api.post(`/store/mates/listings/${id}/offers`, { amount: 16000, buyer_phone: BUYER_PHONE }, buyer)
        )).data.offer.id
        await andWait(MATES_EVENTS.OFFER_UPDATED, () => api.post(`/store/mates/offers/${second}/reject`, {}, seller))
        const rejected = sent(TEMPLATES.MATES_OFFER_REJECTED)
        expect(rejected.map((n) => n.to)).toEqual(["buyer@notify.test"])
        expect(rejected[0].content.text).toContain("declined your offer of Rs 16,000")
        expectNoPhones(rejected[0])
      })

      it("sends nothing when Mates notifications are switched off", async () => {
        process.env.NOTIFY_MATES = "false"
        const seller = await registerCustomer(api, key, "seller@notify.test")
        const id = (await api.post("/store/mates/listings", listingBody(), seller)).data.listing.id
        await andWait(MATES_EVENTS.LISTING_MODERATED, () => api.post(`/admin/mates/listings/${id}/approve`, {}, admin))
        expect(spy).not.toHaveBeenCalled()
      })
    })

    describe("insurance", () => {
      async function plan() {
        const partner = await api.post("/admin/insurance/partners", { name: "Test Insurer" }, admin)
        const res = await api.post(
          "/admin/insurance/plans",
          {
            partner_id: partner.data.partner.id,
            name: "Complete Care",
            pet_types: ["dog"],
            min_age_months: 2,
            max_age_months: 120,
            annual_premium_from: 5000,
            cover_amount: 100000,
          },
          admin
        )
        return res.data.plan.id as string
      }
      const lead = (planId: string) => ({ plan_id: planId, customer_name: "Ravi", phone: "+91 98000 11111", pet_type: "dog", pet_age_months: 24 })

      it("emails the internal inbox with the lead's details", async () => {
        process.env.ADMIN_NOTIFY_EMAIL = "ops@petzy.test"
        const planId = await plan()
        await andWait(INSURANCE_EVENTS.LEAD_CREATED, () => api.post("/store/insurance/leads", lead(planId), store))
        const [n] = sent(TEMPLATES.INSURANCE_LEAD_ADMIN)
        expect(n.to).toBe("ops@petzy.test")
        expect(n.content.text).toContain("Phone: +91 98000 11111")
        expect(n.content.subject).toBe("New insurance lead: Ravi for Complete Care")
      })

      it("skips it, without failing the lead, when no inbox is set", async () => {
        const planId = await plan()
        const res = await andWait(INSURANCE_EVENTS.LEAD_CREATED, () => api.post("/store/insurance/leads", lead(planId), store))
        expect(res.status).toBe(201)
        expect(spy).not.toHaveBeenCalled()
      })
    })

    describe("orders", () => {
      it("sends an order confirmation on order.placed", async () => {
        const container = getContainer()
        const [order] = await container.resolve(Modules.ORDER).createOrders([
          {
            email: "asha@example.com",
            currency_code: "inr",
            items: [{ title: "Chicken Kibble", variant_title: "5 kg", quantity: 2, unit_price: 1499 }],
            shipping_address: { first_name: "Asha", last_name: "Rao", address_1: "12 MG Road", city: "Pune", postal_code: "411001", country_code: "in" },
          },
        ])
        const eventBus = container.resolve(Modules.EVENT_BUS)
        await andWait("order.placed", () => eventBus.emit({ name: "order.placed", data: { id: order.id } }))
        const [n] = sent(TEMPLATES.ORDER_CONFIRMATION)
        expect(n.to).toBe("asha@example.com")
        expect(n.content.subject).toMatch(/^Order #\d+ confirmed$/)
        expect(n.content.text).toContain("Chicken Kibble (5 kg) x 2: Rs 2,998")
        expect(n.content.text).toContain("12 MG Road")
      })
    })
  },
})
