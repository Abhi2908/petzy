import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import fs from "fs"
import path from "path"
import { MATES_MODULE } from "../../src/modules/mates"
import MatesModuleService from "../../src/modules/mates/service"
import { expireMatesListingsWorkflow } from "../../src/workflows/expire-mates-listings"

jest.setTimeout(120_000)

// Phone numbers used only by these tests, so a leak is easy to spot anywhere in a response body.
const SELLER_PHONE = "+91 98111 00001"
const BUYER_PHONE = "+91 98222 00002"
const OTHER_PHONE = "+91 98333 00003"
const BUYER_PROFILE_PHONE = "+91 98444 00004"
const ALL_PHONES = [SELLER_PHONE, BUYER_PHONE, OTHER_PHONE, BUYER_PROFILE_PHONE]
const PASSWORD = "Test-password-123"

type Api = {
  get: (url: string, config?: unknown) => Promise<{ status: number; data: any }>
  post: (url: string, body?: unknown, config?: unknown) => Promise<{ status: number; data: any }>
  delete: (url: string, config?: unknown) => Promise<{ status: number; data: any }>
}
type Headers = { headers: Record<string, string> }
type Customer = Headers & { id: string }

/** Resolves with the error response of a request that is expected to fail. */
async function failure(request: Promise<unknown>) {
  try {
    await request
  } catch (e) {
    return (e as { response: { status: number; data: { type?: string; message: string } } }).response
  }
  throw new Error("Expected the request to fail")
}

/** Fails the test when a phone number appears anywhere in the body. */
function expectNoPhones(body: unknown, allowed: string[] = []) {
  const text = JSON.stringify(body)
  for (const phone of ALL_PHONES.filter((p) => !allowed.includes(p))) {
    expect(text).not.toContain(phone)
  }
}

async function registerCustomer(api: Api, publishableKey: string, email: string, phone?: string): Promise<Customer> {
  const store = { "x-publishable-api-key": publishableKey }
  const registered = await api.post("/auth/customer/emailpass/register", { email, password: PASSWORD })
  await api.post(
    "/store/customers",
    { email, first_name: email.split("@")[0], phone },
    { headers: { ...store, authorization: `Bearer ${registered.data.token}` } }
  )
  const login = await api.post("/auth/customer/emailpass", { email, password: PASSWORD })
  const headers = { ...store, authorization: `Bearer ${login.data.token}` }
  const me = await api.get("/store/customers/me", { headers })
  return { headers, id: me.data.customer.id }
}

async function registerAdmin(api: Api, container: MedusaContainer): Promise<Headers> {
  const email = "admin@mates.test"
  const registered = await api.post("/auth/user/emailpass/register", { email, password: PASSWORD })
  const payload = JSON.parse(Buffer.from(registered.data.token.split(".")[1], "base64url").toString())
  await createUserAccountWorkflow(container).run({ input: { authIdentityId: payload.auth_identity_id, userData: { email } } })
  const login = await api.post("/auth/user/emailpass", { email, password: PASSWORD })
  return { headers: { authorization: `Bearer ${login.data.token}` } }
}

const listingBody = (overrides: Record<string, unknown> = {}) => ({
  title: "Beagle puppy for a loving home",
  pet_type: "dog",
  breed: "Beagle",
  gender: "male",
  age_months: 3,
  color: "Tricolour",
  vaccinated: true,
  dewormed: true,
  has_papers: true,
  description: "Healthy and playful.",
  price: 20000,
  price_negotiable: true,
  city: "Pune",
  state: "Maharashtra",
  pincode: "411001",
  seller_type: "breeder",
  breeder_registration_no: "KCI-TEST-1",
  seller_phone: SELLER_PHONE,
  ...overrides,
})

// Smallest valid images: just the magic bytes plus padding, which is all the check looks at.
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)])

function photoForm(content: Buffer, filename: string, type: string, field = "file") {
  const form = new FormData()
  form.append(field, new Blob([new Uint8Array(content)], { type }), filename)
  return form
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let seller: Customer
    let buyer: Customer
    let other: Customer
    let admin: Headers
    let publicHeaders: Headers
    const uploadedFiles: string[] = []

    beforeEach(async () => {
      const container = getContainer()
      const apiKeys = container.resolve(Modules.API_KEY)
      const key = await apiKeys.createApiKeys({ title: "Mates tests", type: "publishable", created_by: "test" })
      publicHeaders = { headers: { "x-publishable-api-key": key.token } }
      seller = await registerCustomer(api, key.token, "seller@mates.test")
      // The buyer has a different phone on their customer profile. Only the offer's buyer_phone may be shown.
      buyer = await registerCustomer(api, key.token, "buyer@mates.test", BUYER_PROFILE_PHONE)
      other = await registerCustomer(api, key.token, "other@mates.test")
      admin = await registerAdmin(api, container)
    })

    afterAll(() => {
      for (const file of uploadedFiles) {
        fs.rmSync(path.join(process.cwd(), "static", file), { force: true })
      }
    })

    /** A listing created by the seller and approved by Admin. */
    async function activeListing(overrides: Record<string, unknown> = {}) {
      const created = await api.post("/store/mates/listings", listingBody(overrides), seller)
      await api.post(`/admin/mates/listings/${created.data.listing.id}/approve`, {}, admin)
      return created.data.listing.id as string
    }

    async function makeOffer(listingId: string, who: Customer, amount: number, phone: string) {
      const res = await api.post(`/store/mates/listings/${listingId}/offers`, { amount, buyer_phone: phone }, who)
      return res.data.offer.id as string
    }

    describe("listing status changes", () => {
      it("needs a breeder registration number for dogs and answers NOT_ALLOWED", async () => {
        const res = await failure(api.post("/store/mates/listings", listingBody({ breeder_registration_no: null }), seller))
        expect(res.status).toBe(400)
        expect(res.data.type).toBe("not_allowed")
        expect(res.data.message).toMatch(/breeder registration/i)

        const cat = await api.post("/store/mates/listings", listingBody({ pet_type: "cat", breeder_registration_no: null }), seller)
        expect(cat.status).toBe(201)
      })

      it("needs a logged-in customer to post", async () => {
        const res = await failure(api.post("/store/mates/listings", listingBody(), publicHeaders))
        expect(res.status).toBe(401)
      })

      it("moves through review, approval, edit, rejection and sale", async () => {
        // Customers cannot choose the status (or any other field outside the schema).
        const selfApproved = await failure(api.post("/store/mates/listings", listingBody({ status: "active" }), seller))
        expect(selfApproved.status).toBe(400)

        const created = await api.post("/store/mates/listings", listingBody(), seller)
        const id = created.data.listing.id
        expect(created.data.listing.status).toBe("pending_review")
        expect((await failure(api.get(`/store/mates/listings/${id}`, publicHeaders))).status).toBe(404)

        const approved = await api.post(`/admin/mates/listings/${id}/approve`, {}, admin)
        expect(approved.data.listing.status).toBe("active")
        const days = (Date.parse(approved.data.listing.expires_at) - Date.now()) / 86_400_000
        expect(days).toBeGreaterThan(59.9)
        expect(days).toBeLessThanOrEqual(60)
        expect((await api.get(`/store/mates/listings/${id}`, publicHeaders)).data.listing.title).toBe(listingBody().title)

        // Editing an active listing hides it until it is approved again.
        const edited = await api.post(`/store/mates/my/listings/${id}`, { price: 18000 }, seller)
        expect(edited.data.listing).toMatchObject({ status: "pending_review", price: 18000 })
        expect((await failure(api.get(`/store/mates/listings/${id}`, publicHeaders))).status).toBe(404)

        const rejected = await api.post(`/admin/mates/listings/${id}/reject`, { reason: "Add clearer photos" }, admin)
        expect(rejected.data.listing.status).toBe("rejected")
        const mine = await api.get("/store/mates/my/listings", seller)
        expect(mine.data.listings[0]).toMatchObject({ id, status: "rejected", rejection_reason: "Add clearer photos" })

        // Fixing a rejected listing resubmits it.
        const resubmitted = await api.post(`/store/mates/my/listings/${id}`, { description: "Now with photos" }, seller)
        expect(resubmitted.data.listing).toMatchObject({ status: "pending_review", rejection_reason: null })
        await api.post(`/admin/mates/listings/${id}/approve`, {}, admin)
        const approveTwice = await failure(api.post(`/admin/mates/listings/${id}/approve`, {}, admin))
        expect(approveTwice.data.type).toBe("not_allowed")

        const sold = await api.post(`/store/mates/my/listings/${id}/sold`, {}, seller)
        expect(sold.data.listing.status).toBe("sold")
        const editSold = await failure(api.post(`/store/mates/my/listings/${id}`, { price: 1 }, seller))
        expect(editSold.data).toMatchObject({ type: "not_allowed" })
        expect((await failure(api.post(`/store/mates/my/listings/${id}/sold`, {}, seller))).data.type).toBe("not_allowed")
      })

      it("only lets the owner see, edit, sell or delete a listing", async () => {
        const id = await activeListing()
        // Functions, so each request starts only when awaited (an early rejection would be unhandled).
        for (const request of [
          () => api.get(`/store/mates/my/listings/${id}`, other),
          () => api.post(`/store/mates/my/listings/${id}`, { price: 1 }, other),
          () => api.post(`/store/mates/my/listings/${id}/sold`, {}, other),
          () => api.delete(`/store/mates/my/listings/${id}`, other),
        ]) {
          expect((await failure(request())).status).toBe(404)
        }
        expect((await api.get(`/store/mates/listings/${id}`, publicHeaders)).data.listing.status).toBe("active")
      })

      it("lets Admin remove a listing and closes its offers", async () => {
        const id = await activeListing()
        const offerId = await makeOffer(id, buyer, 15000, BUYER_PHONE)
        const removed = await api.post(`/admin/mates/listings/${id}/remove`, {}, admin)
        expect(removed.data.listing.status).toBe("removed")
        expect((await api.get(`/store/mates/offers/${offerId}`, buyer)).data.offer.status).toBe("rejected")
        expect((await failure(api.get(`/store/mates/listings/${id}`, publicHeaders))).status).toBe(404)
      })

      it("expires active listings after their 60 days", async () => {
        const id = await activeListing()
        const offerId = await makeOffer(id, buyer, 15000, BUYER_PHONE)
        const { result } = await expireMatesListingsWorkflow(getContainer()).run({
          input: { now: new Date(Date.now() + 61 * 86_400_000).toISOString() },
        })
        expect(result).toEqual([id])
        expect((await api.get(`/store/mates/my/listings/${id}`, seller)).data.listing.status).toBe("expired")
        expect((await api.get(`/store/mates/offers/${offerId}`, buyer)).data.offer.status).toBe("rejected")

        const again = await expireMatesListingsWorkflow(getContainer()).run({ input: {} })
        expect(again.result).toEqual([])
      })

      it("deletes permanently, with offers, messages and reports", async () => {
        const id = await activeListing()
        const offerId = await makeOffer(id, buyer, 15000, BUYER_PHONE)
        await api.post(`/store/mates/offers/${offerId}/messages`, { body: "Is he still available?" }, buyer)
        await api.post(`/store/mates/listings/${id}/report`, { reason: "Looks like a scam" }, other)

        const deleted = await api.delete(`/store/mates/my/listings/${id}`, seller)
        expect(deleted.data).toEqual({ id, object: "mates_listing", deleted: true })

        const mates: MatesModuleService = getContainer().resolve(MATES_MODULE)
        const withDeleted = { withDeleted: true }
        expect(await mates.listMatesListings({ id }, withDeleted)).toHaveLength(0)
        expect(await mates.listMatesOffers({ listing_id: id }, withDeleted)).toHaveLength(0)
        expect(await mates.listMatesMessages({ offer_id: offerId }, withDeleted)).toHaveLength(0)
        expect(await mates.listMatesReports({ listing_id: id }, withDeleted)).toHaveLength(0)
      })

      it("filters, sorts and pages the public list", async () => {
        await activeListing({ title: "Cheap cat (test)", pet_type: "cat", breed: "Persian", price: 5000, city: "Mumbai", breeder_registration_no: null })
        await activeListing({ title: "Dear dog (test)", price: 50000, gender: "female" })
        await api.post("/store/mates/listings", listingBody({ title: "Waiting for review (test)" }), seller)

        const all = await api.get("/store/mates/listings?sort=price_asc", publicHeaders)
        expect(all.data.listings.map((l: { title: string }) => l.title)).toEqual(["Cheap cat (test)", "Dear dog (test)"])
        expect((await api.get("/store/mates/listings?sort=price_desc&limit=1", publicHeaders)).data).toMatchObject({
          count: 2,
          listings: [{ title: "Dear dog (test)" }],
        })
        expect((await api.get("/store/mates/listings?pet_type=cat", publicHeaders)).data.count).toBe(1)
        expect((await api.get("/store/mates/listings?breed=pers&city=mumbai", publicHeaders)).data.count).toBe(1)
        expect((await api.get("/store/mates/listings?gender=female&min_price=40000", publicHeaders)).data.count).toBe(1)
        expect((await api.get("/store/mates/listings?max_price=1000", publicHeaders)).data.count).toBe(0)
        expect((await failure(api.get("/store/mates/listings?sort=cheapest", publicHeaders))).status).toBe(400)
      })
    })

    describe("offer rules", () => {
      it("checks who can make an offer and on what", async () => {
        const id = await activeListing()
        const fixed = await activeListing({ title: "Fixed price (test)", price_negotiable: false })

        const own = await failure(api.post(`/store/mates/listings/${id}/offers`, { amount: 100, buyer_phone: SELLER_PHONE }, seller))
        expect(own.data).toMatchObject({ type: "not_allowed", message: expect.stringMatching(/own listing/) })
        const zero = await failure(api.post(`/store/mates/listings/${id}/offers`, { amount: 0, buyer_phone: BUYER_PHONE }, buyer))
        expect(zero.data).toMatchObject({ type: "not_allowed", message: expect.stringMatching(/greater than 0/) })
        const noPhone = await failure(api.post(`/store/mates/listings/${id}/offers`, { amount: 100 }, buyer))
        expect(noPhone.status).toBe(400)
        const belowFirm = await failure(api.post(`/store/mates/listings/${fixed}/offers`, { amount: 19000, buyer_phone: BUYER_PHONE }, buyer))
        expect(belowFirm.data).toMatchObject({ type: "not_allowed", message: expect.stringMatching(/firm price of ₹20,000/) })
        const anonymous = await failure(api.post(`/store/mates/listings/${id}/offers`, { amount: 100, buyer_phone: BUYER_PHONE }, publicHeaders))
        expect(anonymous.status).toBe(401)

        const pending = (await api.post("/store/mates/listings", listingBody(), seller)).data.listing.id
        expect((await failure(api.post(`/store/mates/listings/${pending}/offers`, { amount: 100, buyer_phone: BUYER_PHONE }, buyer))).status).toBe(404)

        await makeOffer(id, buyer, 15000, BUYER_PHONE)
        const second = await failure(api.post(`/store/mates/listings/${id}/offers`, { amount: 16000, buyer_phone: BUYER_PHONE }, buyer))
        expect(second.data).toMatchObject({ type: "not_allowed", message: expect.stringMatching(/already have an offer/) })
      })

      it("takes an offer on a firm-price listing only at the asking price, and never a counter", async () => {
        const fixed = await activeListing({ title: "Fixed price (test)", price_negotiable: false, price: 20000 })
        for (const amount of [1, 19999, 20001, 40000]) {
          const wrong = await failure(api.post(`/store/mates/listings/${fixed}/offers`, { amount, buyer_phone: BUYER_PHONE }, buyer))
          expect(wrong.data).toMatchObject({ type: "not_allowed", message: expect.stringMatching(/exactly that amount/) })
        }
        expect((await failure(api.post(`/store/mates/listings/${fixed}/offers`, { amount: 20000, buyer_phone: SELLER_PHONE }, seller))).data.message).toMatch(
          /own listing/
        )

        const offerId = await makeOffer(fixed, buyer, 20000, BUYER_PHONE)
        const view = (await api.get(`/store/mates/offers/${offerId}`, seller)).data.offer
        expect(view).toMatchObject({ amount: 20000, status: "open", your_turn: true })

        // One live offer per buyer applies here too.
        expect((await failure(api.post(`/store/mates/listings/${fixed}/offers`, { amount: 20000, buyer_phone: BUYER_PHONE }, buyer))).data.message).toMatch(
          /already have an offer/
        )
        // A firm price is not up for discussion: no counter, from either side.
        const counter = await failure(api.post(`/store/mates/offers/${offerId}/counter`, { amount: 18000 }, seller))
        expect(counter.data).toMatchObject({ type: "not_allowed", message: expect.stringMatching(/firm price/) })
        expect((await api.get(`/store/mates/offers/${offerId}`, seller)).data.offer).toMatchObject({ status: "open", amount: 20000 })

        // The seller can still accept (or reject); accepting reserves the listing as usual.
        const accepted = await api.post(`/store/mates/offers/${offerId}/accept`, {}, seller)
        expect(accepted.data.offer).toMatchObject({ status: "accepted", amount: 20000 })
        expect(accepted.data.offer.listing.status).toBe("reserved")

        // Negotiable listings keep taking any amount above 0.
        const negotiable = await activeListing({ title: "Negotiable (test)" })
        expect((await api.post(`/store/mates/listings/${negotiable}/offers`, { amount: 1, buyer_phone: BUYER_PHONE }, buyer)).status).toBe(201)
      })

      it("takes turns: the seller answers open offers, the buyer answers counters", async () => {
        const id = await activeListing()
        const offerId = await makeOffer(id, buyer, 15000, BUYER_PHONE)

        const buyerAccepts = await failure(api.post(`/store/mates/offers/${offerId}/accept`, {}, buyer))
        expect(buyerAccepts.data).toMatchObject({ type: "not_allowed", message: expect.stringMatching(/seller's turn/) })
        expect((await failure(api.post(`/store/mates/offers/${offerId}/counter`, { amount: 16000 }, buyer))).data.type).toBe("not_allowed")

        const countered = await api.post(`/store/mates/offers/${offerId}/counter`, { amount: 18000 }, seller)
        expect(countered.data.offer).toMatchObject({ status: "countered", amount: 18000, last_actor: "seller", your_turn: false })
        expect((await failure(api.post(`/store/mates/offers/${offerId}/accept`, {}, seller))).data.message).toMatch(/buyer's turn/)
        expect((await failure(api.post(`/store/mates/offers/${offerId}/counter`, { amount: 0 }, buyer))).data.type).toBe("not_allowed")

        const back = await api.post(`/store/mates/offers/${offerId}/counter`, { amount: 17000 }, buyer)
        expect(back.data.offer).toMatchObject({ status: "open", amount: 17000, last_actor: "buyer" })
        expect((await api.get(`/store/mates/offers/${offerId}`, seller)).data.offer.your_turn).toBe(true)

        // Either side may reject or withdraw while it is live, whoever's turn it is.
        const withdrawn = await api.post(`/store/mates/offers/${offerId}/withdraw`, {}, buyer)
        expect(withdrawn.data.offer.status).toBe("withdrawn")
        expect((await failure(api.post(`/store/mates/offers/${offerId}/reject`, {}, seller))).data.message).toMatch(/already withdrawn/)

        // A closed offer no longer counts as live, so the buyer can try again.
        const fresh = await makeOffer(id, buyer, 16000, BUYER_PHONE)
        const rejectedByBuyer = await api.post(`/store/mates/offers/${fresh}/reject`, {}, buyer)
        expect(rejectedByBuyer.data.offer).toMatchObject({ status: "rejected", last_actor: "buyer" })
      })

      it("accepting reserves the listing and rejects every other live offer; release reopens it", async () => {
        const id = await activeListing()
        const offerId = await makeOffer(id, buyer, 15000, BUYER_PHONE)
        const otherOffer = await makeOffer(id, other, 14000, OTHER_PHONE)

        const accepted = await api.post(`/store/mates/offers/${offerId}/accept`, {}, seller)
        expect(accepted.data.offer.status).toBe("accepted")
        expect(accepted.data.offer.listing.status).toBe("reserved")
        expect((await api.get(`/store/mates/offers/${otherOffer}`, other)).data.offer.status).toBe("rejected")
        expect((await failure(api.get(`/store/mates/listings/${id}`, publicHeaders))).status).toBe(404)
        expect((await failure(api.post(`/store/mates/listings/${id}/offers`, { amount: 1, buyer_phone: OTHER_PHONE }, other))).status).toBe(404)
        expect((await failure(api.post(`/store/mates/offers/${offerId}/withdraw`, {}, buyer))).data.message).toMatch(/already accepted/)

        const released = await api.post(`/store/mates/my/listings/${id}/release`, {}, seller)
        expect(released.data.listing.status).toBe("active")
        const after = (await api.get(`/store/mates/offers/${offerId}`, buyer)).data.offer
        expect(after.status).toBe("withdrawn")
        expect(after).not.toHaveProperty("seller_phone")
        expect((await failure(api.post(`/store/mates/my/listings/${id}/release`, {}, seller))).data.type).toBe("not_allowed")
      })

      it("lets only one of two simultaneous accepts win", async () => {
        const id = await activeListing()
        const first = await makeOffer(id, buyer, 15000, BUYER_PHONE)
        const second = await makeOffer(id, other, 15500, OTHER_PHONE)

        const results = await Promise.allSettled([
          api.post(`/store/mates/offers/${first}/accept`, {}, seller),
          api.post(`/store/mates/offers/${second}/accept`, {}, seller),
        ])
        expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
        const mates: MatesModuleService = getContainer().resolve(MATES_MODULE)
        expect(await mates.listMatesOffers({ listing_id: id, status: "accepted" })).toHaveLength(1)
        expect((await mates.retrieveMatesListing(id)).status).toBe("reserved")
      })

      it("keeps offers and messages between the two participants", async () => {
        const id = await activeListing()
        const offerId = await makeOffer(id, buyer, 15000, BUYER_PHONE)
        await api.post(`/store/mates/offers/${offerId}/messages`, { body: "Can I visit on Sunday?" }, buyer)
        await api.post(`/store/mates/offers/${offerId}/messages`, { body: "Yes, after 11." }, seller)

        const thread = await api.get(`/store/mates/offers/${offerId}/messages`, seller)
        expect(thread.data.messages.map((m: { sender: string; body: string }) => [m.sender, m.body])).toEqual([
          ["buyer", "Can I visit on Sunday?"],
          ["seller", "Yes, after 11."],
        ])

        for (const request of [
          () => api.get(`/store/mates/offers/${offerId}`, other),
          () => api.get(`/store/mates/offers/${offerId}/messages`, other),
          () => api.post(`/store/mates/offers/${offerId}/messages`, { body: "Hello" }, other),
          () => api.post(`/store/mates/offers/${offerId}/reject`, {}, other),
        ]) {
          expect((await failure(request())).status).toBe(404)
        }
        expect((await failure(api.get(`/store/mates/offers/${offerId}/messages`, publicHeaders))).status).toBe(401)

        await api.post(`/store/mates/offers/${offerId}/withdraw`, {}, buyer)
        const closed = await failure(api.post(`/store/mates/offers/${offerId}/messages`, { body: "Wait" }, buyer))
        expect(closed.data.type).toBe("not_allowed")
      })

      it("lists my offers and the offers on my listings", async () => {
        const id = await activeListing()
        await makeOffer(id, buyer, 15000, BUYER_PHONE)
        await makeOffer(id, other, 14000, OTHER_PHONE)

        expect((await api.get("/store/mates/my/offers", buyer)).data.offers).toHaveLength(1)
        const received = await api.get(`/store/mates/my/received-offers?listing_id=${id}`, seller)
        expect(received.data.offers.map((o: { amount: number }) => o.amount).sort()).toEqual([14000, 15000])
        expect((await api.get("/store/mates/my/received-offers", buyer)).data.offers).toHaveLength(0)
      })

      it("takes one open report per customer and not on your own listing", async () => {
        const id = await activeListing()
        const report = await api.post(`/store/mates/listings/${id}/report`, { reason: "Price looks fake" }, other)
        expect(report.data.report).toMatchObject({ reason: "Price looks fake", status: "open" })
        expect((await failure(api.post(`/store/mates/listings/${id}/report`, { reason: "Again please" }, other))).data.type).toBe("not_allowed")
        expect((await failure(api.post(`/store/mates/listings/${id}/report`, { reason: "My own" }, seller))).data.type).toBe("not_allowed")

        const reports = await api.get("/admin/mates/reports?status=open", admin)
        expect(reports.data.count).toBe(1)
        const resolved = await api.post(`/admin/mates/reports/${report.data.report.id}`, { status: "resolved" }, admin)
        expect(resolved.data.report.status).toBe("resolved")
      })
    })

    describe("phone number privacy", () => {
      it("shows no phone to anyone before acceptance", async () => {
        const id = await activeListing()
        const offerId = await makeOffer(id, buyer, 15000, BUYER_PHONE)
        await makeOffer(id, other, 14000, OTHER_PHONE)
        await api.post(`/store/mates/offers/${offerId}/messages`, { body: "Hello" }, buyer)
        const report = await api.post(`/store/mates/listings/${id}/report`, { reason: "Checking privacy" }, other)

        const responses = [
          await api.get("/store/mates/listings", publicHeaders),
          await api.get(`/store/mates/listings/${id}`, publicHeaders),
          await api.get("/store/mates/my/listings", other),
          await api.get(`/store/mates/offers/${offerId}`, buyer),
          await api.get(`/store/mates/offers/${offerId}`, seller),
          await api.get("/store/mates/my/offers", buyer),
          await api.get("/store/mates/my/received-offers", seller),
          await api.get(`/store/mates/offers/${offerId}/messages`, seller),
          report,
          await api.post(`/store/mates/offers/${offerId}/counter`, { amount: 18000 }, seller),
        ]
        for (const res of responses) {
          expectNoPhones(res.data)
          expect(JSON.stringify(res.data)).not.toContain(seller.id)
          expect(JSON.stringify(res.data)).not.toContain(buyer.id)
        }
      })

      it("returns seller_phone to the owner on GET /store/mates/my/listings and /my/listings/:id, and nowhere else", async () => {
        // The owner's two read routes show the phone they entered.
        const created = await api.post("/store/mates/listings", listingBody(), seller)
        const id = created.data.listing.id
        const mine = await api.get("/store/mates/my/listings", seller)
        expect(mine.data.listings).toHaveLength(1)
        expect(mine.data.listings[0]).toMatchObject({ id, seller_phone: SELLER_PHONE })
        expect(mine.data.listings[0]).not.toHaveProperty("seller_customer_id")
        const one = await api.get(`/store/mates/my/listings/${id}`, seller)
        expect(one.data.listing).toMatchObject({ id, seller_phone: SELLER_PHONE })
        expect(one.data.listing).not.toHaveProperty("seller_customer_id")
        expectNoPhones(one.data, [SELLER_PHONE])
        // Another customer cannot read it through the owner route at all.
        expect((await failure(api.get(`/store/mates/my/listings/${id}`, other))).status).toBe(404)
        expect((await failure(api.get(`/store/mates/my/listings/${id}`, publicHeaders))).status).toBe(401)

        // Every other response about the same listing stays phone-free, including the owner's other routes.
        const approved = await api.post(`/admin/mates/listings/${id}/approve`, {}, admin)
        expect(approved.data.listing.seller_phone).toBe(SELLER_PHONE) // Admin may see it.
        const offerId = await makeOffer(id, buyer, 15000, BUYER_PHONE)
        const ownerResponses = [
          created,
          await api.post(`/store/mates/my/listings/${id}`, { description: "Updated" }, seller),
          await api.get("/store/mates/my/received-offers", seller),
          await api.get(`/store/mates/offers/${offerId}`, seller),
        ]
        await api.post(`/admin/mates/listings/${id}/approve`, {}, admin)
        const otherResponses = [
          await api.get("/store/mates/listings", publicHeaders),
          await api.get(`/store/mates/listings/${id}`, publicHeaders),
          await api.get("/store/mates/my/listings", buyer),
          await api.get("/store/mates/my/listings", other),
          await api.get(`/store/mates/offers/${offerId}`, buyer),
          await api.get("/store/mates/my/offers", buyer),
        ]
        ownerResponses.push(await api.post(`/store/mates/my/listings/${id}/sold`, {}, seller))
        for (const res of [...ownerResponses, ...otherResponses]) {
          expectNoPhones(res.data)
        }
        expect((await failure(api.get("/store/mates/my/listings", publicHeaders))).status).toBe(401)

        // Still there in the owner's reads after the listing changes status.
        expect((await api.get("/store/mates/my/listings", seller)).data.listings[0]).toMatchObject({ status: "sold", seller_phone: SELLER_PHONE })
        expect((await api.get(`/store/mates/my/listings/${id}`, seller)).data.listing).toMatchObject({ status: "sold", seller_phone: SELLER_PHONE })
      })

      it("after acceptance shows each side only the other's phone, on that offer only", async () => {
        const id = await activeListing()
        const offerId = await makeOffer(id, buyer, 15000, BUYER_PHONE)
        const otherOffer = await makeOffer(id, other, 14000, OTHER_PHONE)

        // The seller accepts: their response carries the buyer's phone from the offer, not from the profile.
        const accepted = await api.post(`/store/mates/offers/${offerId}/accept`, {}, seller)
        expect(accepted.data.offer.buyer_phone).toBe(BUYER_PHONE)
        expectNoPhones(accepted.data, [BUYER_PHONE])

        const sellerView = await api.get(`/store/mates/offers/${offerId}`, seller)
        expect(sellerView.data.offer.buyer_phone).toBe(BUYER_PHONE)
        expect(sellerView.data.offer).not.toHaveProperty("seller_phone")
        expectNoPhones(sellerView.data, [BUYER_PHONE])

        const buyerView = await api.get(`/store/mates/offers/${offerId}`, buyer)
        expect(buyerView.data.offer.seller_phone).toBe(SELLER_PHONE)
        expect(buyerView.data.offer).not.toHaveProperty("buyer_phone")
        expectNoPhones(buyerView.data, [SELLER_PHONE])

        expect((await api.get("/store/mates/my/offers", buyer)).data.offers[0].seller_phone).toBe(SELLER_PHONE)
        const received = (await api.get("/store/mates/my/received-offers", seller)).data.offers
        expect(received.find((o: { id: string }) => o.id === offerId).buyer_phone).toBe(BUYER_PHONE)
        expectNoPhones(received.find((o: { id: string }) => o.id === otherOffer), [])

        // The rejected bidder learns nothing, and nothing else starts showing phones.
        expectNoPhones((await api.get(`/store/mates/offers/${otherOffer}`, other)).data)
        // The owner's own listing read shows only their own phone, never the buyer's.
        expectNoPhones((await api.get(`/store/mates/my/listings/${id}`, seller)).data, [SELLER_PHONE])
        expectNoPhones((await api.get("/store/mates/listings", publicHeaders)).data)
        await api.post(`/store/mates/offers/${offerId}/messages`, { body: "See you Sunday" }, seller)
        expectNoPhones((await api.get(`/store/mates/offers/${offerId}/messages`, buyer)).data)
        expect(JSON.stringify(await api.get("/store/mates/my/offers", buyer).then((r) => r.data))).not.toContain(BUYER_PROFILE_PHONE)
      })

      it("on a firm-price purchase hides phones until the seller accepts, then each side sees the other's", async () => {
        const id = await activeListing({ title: "Firm privacy (test)", price_negotiable: false, price: 20000 })
        const offerId = await makeOffer(id, buyer, 20000, BUYER_PHONE)
        await api.post(`/store/mates/offers/${offerId}/messages`, { body: "I will take it" }, buyer)

        for (const res of [
          await api.get(`/store/mates/offers/${offerId}`, buyer),
          await api.get(`/store/mates/offers/${offerId}`, seller),
          await api.get("/store/mates/my/offers", buyer),
          await api.get("/store/mates/my/received-offers", seller),
          await api.get(`/store/mates/offers/${offerId}/messages`, seller),
          await api.get(`/store/mates/listings/${id}`, publicHeaders),
          await failure(api.post(`/store/mates/offers/${offerId}/counter`, { amount: 1 }, seller)),
        ]) {
          expectNoPhones(res.data)
        }

        const accepted = await api.post(`/store/mates/offers/${offerId}/accept`, {}, seller)
        expect(accepted.data.offer.buyer_phone).toBe(BUYER_PHONE)
        expectNoPhones(accepted.data, [BUYER_PHONE])
        const buyerView = await api.get(`/store/mates/offers/${offerId}`, buyer)
        expect(buyerView.data.offer.seller_phone).toBe(SELLER_PHONE)
        expectNoPhones(buyerView.data, [SELLER_PHONE])
        expectNoPhones((await api.get(`/store/mates/offers/${offerId}/messages`, buyer)).data)
        expect(JSON.stringify(buyerView.data)).not.toContain(BUYER_PROFILE_PHONE)
      })

      it("lets Admin see phone numbers", async () => {
        const id = await activeListing()
        await makeOffer(id, buyer, 15000, BUYER_PHONE)
        const listing = await api.get(`/admin/mates/listings/${id}`, admin)
        expect(listing.data.listing.seller_phone).toBe(SELLER_PHONE)
        expect(listing.data.listing.offers[0].buyer_phone).toBe(BUYER_PHONE)
        expect((await api.get("/admin/mates/offers", admin)).data.offers[0].buyer_phone).toBe(BUYER_PHONE)
        expect((await failure(api.get("/admin/mates/listings", seller))).status).toBe(401)
      })
    })

    describe("photo uploads", () => {
      it("stores a real image and returns its URL", async () => {
        const res = await api.post("/store/mates/uploads", photoForm(PNG, "../../evil name.png", "image/png"), buyer)
        expect(res.status).toBe(201)
        expect(res.data.url).toMatch(/\/static\/\d+-mates-[0-9a-f-]+\.png$/)
        const file = res.data.url.split("/static/")[1]
        uploadedFiles.push(file)
        expect(fs.readFileSync(path.join(process.cwd(), "static", file)).equals(PNG)).toBe(true)

        // The URL is usable in a listing.
        const created = await api.post("/store/mates/listings", listingBody({ image_urls: [res.data.url] }), seller)
        expect(created.data.listing.image_urls).toEqual([res.data.url])
      })

      it("checks the real content, not the name or stated type", async () => {
        const fake = await failure(api.post("/store/mates/uploads", photoForm(Buffer.from("<html>hi</html>"), "cute.png", "image/png"), buyer))
        expect(fake.data).toMatchObject({ type: "not_allowed", message: expect.stringMatching(/JPG, PNG or WebP/) })
        const gif = await failure(api.post("/store/mates/uploads", photoForm(Buffer.from("GIF89a....."), "cute.jpg", "image/jpeg"), buyer))
        expect(gif.data.type).toBe("not_allowed")
      })

      it("refuses files over 5 MB while receiving them", async () => {
        const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)])
        const res = await failure(api.post("/store/mates/uploads", photoForm(big, "big.png", "image/png"), buyer))
        expect(res.status).toBe(400)
        expect(res.data).toMatchObject({ type: "not_allowed", message: expect.stringMatching(/5 MB/) })
      })

      it("needs a logged-in customer and exactly one file", async () => {
        expect((await failure(api.post("/store/mates/uploads", photoForm(PNG, "a.png", "image/png"), publicHeaders))).status).toBe(401)

        const two = new FormData()
        two.append("file", new Blob([new Uint8Array(PNG)], { type: "image/png" }), "a.png")
        two.append("file", new Blob([new Uint8Array(PNG)], { type: "image/png" }), "b.png")
        expect((await failure(api.post("/store/mates/uploads", two, buyer))).data.type).toBe("not_allowed")

        expect((await failure(api.post("/store/mates/uploads", photoForm(PNG, "a.png", "image/png", "photo"), buyer))).data.type).toBe(
          "not_allowed"
        )
        expect((await failure(api.post("/store/mates/uploads", new FormData(), buyer))).status).toBe(400)
      })
    })
  },
})
