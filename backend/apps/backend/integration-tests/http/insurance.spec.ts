import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { INSURANCE_MODULE } from "../../src/modules/insurance"
import InsuranceModuleService from "../../src/modules/insurance/service"

jest.setTimeout(120_000)

const PASSWORD = "Test-password-123"

type Api = {
  get: (url: string, config?: unknown) => Promise<{ status: number; data: any; headers: Record<string, string> }>
  post: (url: string, body?: unknown, config?: unknown) => Promise<{ status: number; data: any }>
  delete: (url: string, config?: unknown) => Promise<{ status: number; data: any }>
}
type Headers = { headers: Record<string, string> }

async function failure(request: Promise<unknown>) {
  try {
    await request
  } catch (e) {
    return (e as { response: { status: number; data: { type?: string; message: string } } }).response
  }
  throw new Error("Expected the request to fail")
}

async function registerAdmin(api: Api, container: MedusaContainer): Promise<Headers> {
  const email = "admin@insurance.test"
  const registered = await api.post("/auth/user/emailpass/register", { email, password: PASSWORD })
  const payload = JSON.parse(Buffer.from(registered.data.token.split(".")[1], "base64url").toString())
  await createUserAccountWorkflow(container).run({ input: { authIdentityId: payload.auth_identity_id, userData: { email } } })
  const login = await api.post("/auth/user/emailpass", { email, password: PASSWORD })
  return { headers: { authorization: `Bearer ${login.data.token}` } }
}

const planBody = (partnerId: string, overrides: Record<string, unknown> = {}) => ({
  partner_id: partnerId,
  name: "Complete Care (test)",
  description: "Accident and illness",
  pet_types: ["dog", "cat"],
  min_age_months: 3,
  max_age_months: 96,
  annual_premium_from: 5000,
  cover_amount: 200000,
  highlights: ["Illness", "Surgery"],
  exclusions: ["Existing conditions"],
  sort_order: 10,
  ...overrides,
})

const leadBody = (planId: string, overrides: Record<string, unknown> = {}) => ({
  plan_id: planId,
  customer_name: "Asha Rao",
  phone: "+91 98765 43210",
  email: "asha@example.com",
  pet_name: "Bruno",
  pet_type: "dog",
  breed: "Beagle",
  pet_age_months: 24,
  city: "Pune",
  pincode: "411001",
  message: "Please call after 6 pm",
  ...overrides,
})

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let admin: Headers
    let store: Headers

    beforeEach(async () => {
      const container = getContainer()
      const key = await container
        .resolve(Modules.API_KEY)
        .createApiKeys({ title: "Insurance tests", type: "publishable", created_by: "test" })
      store = { headers: { "x-publishable-api-key": key.token } }
      admin = await registerAdmin(api, container)
    })

    async function partner(overrides: Record<string, unknown> = {}) {
      const res = await api.post(
        "/admin/insurance/partners",
        {
          name: "Test Insurer",
          website_url: "https://example.com",
          contact_email: "partner@example.com",
          contact_phone: "+91 90000 11111",
          notes: "Internal note",
          ...overrides,
        },
        admin
      )
      return res.data.partner.id as string
    }

    async function plan(partnerId: string, overrides: Record<string, unknown> = {}) {
      const res = await api.post("/admin/insurance/plans", planBody(partnerId, overrides), admin)
      return res.data.plan.id as string
    }

    describe("plan listing and filters", () => {
      it("shows only active plans of active partners, in sort order, without partner contact details", async () => {
        const active = await partner()
        const inactive = await partner({ name: "Paused Insurer", status: "inactive" })
        await plan(active, { name: "Second", sort_order: 20 })
        await plan(active, { name: "First", sort_order: 10 })
        const hidden = await plan(active, { name: "Hidden plan", status: "inactive" })
        const ofInactive = await plan(inactive, { name: "Paused partner plan" })

        const res = await api.get("/store/insurance/plans", store)
        expect(res.data.plans.map((p: { name: string }) => p.name)).toEqual(["First", "Second"])
        const text = JSON.stringify(res.data)
        for (const secret of ["partner@example.com", "90000 11111", "Internal note", "contact_", "notes"]) {
          expect(text).not.toContain(secret)
        }
        expect(res.data.plans[0].partner).toEqual({ id: active, name: "Test Insurer", logo_url: null, website_url: "https://example.com" })

        expect((await failure(api.get(`/store/insurance/plans/${hidden}`, store))).status).toBe(404)
        expect((await failure(api.get(`/store/insurance/plans/${ofInactive}`, store))).status).toBe(404)

        // Deactivating the partner hides all of its plans at once.
        await api.post(`/admin/insurance/partners/${active}`, { status: "inactive" }, admin)
        expect((await api.get("/store/insurance/plans", store)).data.count).toBe(0)
      })

      it("filters by pet type, pet age and premium ceiling", async () => {
        const p = await partner()
        await plan(p, { name: "Dogs and cats", pet_types: ["dog", "cat"], min_age_months: 3, max_age_months: 96, annual_premium_from: 5000 })
        await plan(p, { name: "Seniors", pet_types: ["dog", "cat"], min_age_months: 84, max_age_months: 168, annual_premium_from: 8000, sort_order: 20 })
        await plan(p, { name: "Birds", pet_types: ["bird"], min_age_months: 1, max_age_months: 120, annual_premium_from: 1000, sort_order: 30 })
        const names = async (query: string) =>
          (await api.get(`/store/insurance/plans${query}`, store)).data.plans.map((x: { name: string }) => x.name)

        expect(await names("")).toEqual(["Dogs and cats", "Seniors", "Birds"])
        expect(await names("?pet_type=dog")).toEqual(["Dogs and cats", "Seniors"])
        expect(await names("?pet_type=fish")).toEqual([])
        expect(await names("?pet_age_months=90")).toEqual(["Dogs and cats", "Seniors", "Birds"])
        expect(await names("?pet_age_months=2")).toEqual(["Birds"])
        expect(await names("?pet_type=cat&pet_age_months=150")).toEqual(["Seniors"])
        expect(await names("?max_premium=5000")).toEqual(["Dogs and cats", "Birds"])
        expect(await names("?pet_type=dog&pet_age_months=90&max_premium=6000")).toEqual(["Dogs and cats"])
        expect((await failure(api.get("/store/insurance/plans?pet_type=snake", store))).status).toBe(400)
        expect((await failure(api.get("/store/insurance/plans?pet_age_months=old", store))).status).toBe(400)
      })
    })

    describe("lead rules", () => {
      it("lets a guest send a lead and returns only a receipt", async () => {
        const planId = await plan(await partner())
        const res = await api.post("/store/insurance/leads", leadBody(planId), store)
        expect(res.status).toBe(201)
        expect(res.data.lead).toMatchObject({ status: "new", plan: { id: planId, name: "Complete Care (test)" }, partner: { name: "Test Insurer" } })
        expect(JSON.stringify(res.data)).not.toMatch(/98765|asha@example.com|internal_notes/)

        const insurance: InsuranceModuleService = getContainer().resolve(INSURANCE_MODULE)
        const [stored] = await insurance.listInsuranceLeads({ id: res.data.lead.id })
        expect(stored).toMatchObject({ phone: "+91 98765 43210", phone_key: "9876543210", status: "new", pet_age_months: 24 })
      })

      it("needs a phone number, a known pet type and an age", async () => {
        const planId = await plan(await partner())
        const { phone: _phone, ...withoutPhone } = leadBody(planId)
        expect((await failure(api.post("/store/insurance/leads", withoutPhone, store))).status).toBe(400)
        expect((await failure(api.post("/store/insurance/leads", leadBody(planId, { phone: "call me" }), store))).status).toBe(400)
        expect((await failure(api.post("/store/insurance/leads", leadBody(planId, { pet_type: "snake" }), store))).status).toBe(400)
        expect((await failure(api.post("/store/insurance/leads", leadBody(planId, { pet_age_months: undefined }), store))).status).toBe(400)
        // Optional fields really are optional.
        const minimal = { plan_id: planId, customer_name: "Ravi", phone: "9811100000", pet_type: "cat", pet_age_months: 5 }
        expect((await api.post("/store/insurance/leads", minimal, store)).status).toBe(201)
      })

      it("refuses a pet the plan does not cover, with a clear NOT_ALLOWED message", async () => {
        const planId = await plan(await partner())
        const bird = await failure(api.post("/store/insurance/leads", leadBody(planId, { pet_type: "bird" }), store))
        expect(bird.status).toBe(400)
        expect(bird.data).toEqual({ type: "not_allowed", message: "Complete Care (test) covers dogs and cats only." })

        const young = await failure(api.post("/store/insurance/leads", leadBody(planId, { pet_age_months: 2 }), store))
        expect(young.data).toEqual({
          type: "not_allowed",
          message: "Complete Care (test) covers pets aged 3 months to 8 years. Your pet is 2 months.",
        })
        const old = await failure(api.post("/store/insurance/leads", leadBody(planId, { pet_age_months: 120 }), store))
        expect(old.data.message).toMatch(/Your pet is 10 years\.$/)

        // Edges of the range are inside it.
        expect((await api.post("/store/insurance/leads", leadBody(planId, { pet_age_months: 3, phone: "9000000001" }), store)).status).toBe(201)
        expect((await api.post("/store/insurance/leads", leadBody(planId, { pet_age_months: 96, phone: "9000000002" }), store)).status).toBe(201)
      })

      it("does not take leads for inactive or unknown plans", async () => {
        const p = await partner()
        const inactivePlan = await plan(p, { status: "inactive" })
        expect((await failure(api.post("/store/insurance/leads", leadBody(inactivePlan), store))).status).toBe(404)

        const live = await plan(p, { name: "Live" })
        await api.post(`/admin/insurance/partners/${p}`, { status: "inactive" }, admin)
        expect((await failure(api.post("/store/insurance/leads", leadBody(live), store))).status).toBe(404)
        expect((await failure(api.post("/store/insurance/leads", leadBody("inspl_missing"), store))).status).toBe(404)
      })
    })

    describe("daily limit", () => {
      it("takes 3 leads per phone number in 24 hours, however the number is written, across plans", async () => {
        const p = await partner()
        const a = await plan(p, { name: "Plan A" })
        const b = await plan(p, { name: "Plan B" })
        for (const [planId, phone] of [[a, "+91 98765 43210"], [b, "098765-43210"], [a, "9876543210"]]) {
          expect((await api.post("/store/insurance/leads", leadBody(planId, { phone }), store)).status).toBe(201)
        }
        const fourth = await failure(api.post("/store/insurance/leads", leadBody(b, { phone: "91 98765 43210" }), store))
        expect(fourth.status).toBe(400)
        expect(fourth.data).toEqual({
          type: "not_allowed",
          message: "You have already sent 3 requests in the last 24 hours from this phone number. Please try again tomorrow.",
        })
        // Another number is not affected.
        expect((await api.post("/store/insurance/leads", leadBody(a, { phone: "+91 98765 43211" }), store)).status).toBe(201)
      })

      it("holds when requests arrive at the same moment", async () => {
        const planId = await plan(await partner())
        const results = await Promise.allSettled(
          Array.from({ length: 6 }, () => api.post("/store/insurance/leads", leadBody(planId, { phone: "+91 91234 56789" }), store))
        )
        expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3)
        const insurance: InsuranceModuleService = getContainer().resolve(INSURANCE_MODULE)
        expect(await insurance.listInsuranceLeads({ phone_key: "9123456789" })).toHaveLength(3)
      })

      it("counts the last 24 hours, so older leads no longer count", async () => {
        const planId = await plan(await partner())
        const insurance: InsuranceModuleService = getContainer().resolve(INSURANCE_MODULE)
        for (let i = 0; i < 3; i++) {
          await api.post("/store/insurance/leads", leadBody(planId), store)
        }
        expect((await failure(api.post("/store/insurance/leads", leadBody(planId), store))).data.type).toBe("not_allowed")

        // Move one lead to 25 hours ago: one slot frees up, and only one.
        const [oldest] = await insurance.listInsuranceLeads({ phone_key: "9876543210" }, { order: { created_at: "ASC" } })
        // created_at is not in the generated update type, but the column can be written; tests only.
        await insurance.updateInsuranceLeads({
          id: oldest.id,
          created_at: new Date(Date.now() - 25 * 3600_000),
        } as unknown as { id: string })
        expect((await api.post("/store/insurance/leads", leadBody(planId), store)).status).toBe(201)
        expect((await failure(api.post("/store/insurance/leads", leadBody(planId), store))).data.type).toBe("not_allowed")
      })

      it("does not count requests refused for other reasons", async () => {
        const planId = await plan(await partner())
        for (let i = 0; i < 4; i++) {
          await failure(api.post("/store/insurance/leads", leadBody(planId, { pet_type: "bird" }), store))
        }
        expect((await api.post("/store/insurance/leads", leadBody(planId), store)).status).toBe(201)
      })
    })

    describe("admin", () => {
      it("checks plan settings and links", async () => {
        const p = await partner()
        const ages = await failure(api.post("/admin/insurance/plans", planBody(p, { min_age_months: 50, max_age_months: 40 }), admin))
        expect(ages.data).toMatchObject({ type: "not_allowed", message: expect.stringMatching(/maximum age/) })
        const noPets = await failure(api.post("/admin/insurance/plans", planBody(p, { pet_types: [] }), admin))
        expect(noPets.data).toMatchObject({ type: "not_allowed", message: expect.stringMatching(/at least one pet type/) })
        const planId = await plan(p)
        const edit = await failure(api.post(`/admin/insurance/plans/${planId}`, { max_age_months: 1 }, admin))
        expect(edit.data.type).toBe("not_allowed")
        expect((await failure(api.post("/admin/insurance/partners", { name: "X", logo_url: "javascript:alert(1)" }, admin))).status).toBe(400)
        expect((await failure(api.post("/admin/insurance/partners", { name: "X" }, store))).status).toBe(401)
      })

      it("deleting a partner permanently removes its plans and their leads, and reports the counts", async () => {
        const doomed = await partner({ name: "Doomed" })
        const kept = await partner({ name: "Kept" })
        const a = await plan(doomed, { name: "A" })
        const b = await plan(doomed, { name: "B" })
        const c = await plan(kept, { name: "C" })
        await api.post("/store/insurance/leads", leadBody(a, { phone: "9000000010" }), store)
        await api.post("/store/insurance/leads", leadBody(b, { phone: "9000000011" }), store)
        await api.post("/store/insurance/leads", leadBody(c, { phone: "9000000012" }), store)

        const listed = (await api.get("/admin/insurance/partners", admin)).data.partners
        expect(listed.find((p: { id: string }) => p.id === doomed)).toMatchObject({ plan_count: 2, lead_count: 2 })

        const res = await api.delete(`/admin/insurance/partners/${doomed}`, admin)
        expect(res.data).toEqual({ id: doomed, object: "insurance_partner", deleted: true, plans_deleted: 2, leads_deleted: 2 })

        const insurance: InsuranceModuleService = getContainer().resolve(INSURANCE_MODULE)
        const all = { withDeleted: true }
        expect(await insurance.listInsurancePartners({ id: doomed }, all)).toHaveLength(0)
        expect(await insurance.listInsurancePlans({ id: [a, b] }, all)).toHaveLength(0)
        expect(await insurance.listInsuranceLeads({ plan_id: [a, b] }, all)).toHaveLength(0)
        expect(await insurance.listInsuranceLeads({ plan_id: c })).toHaveLength(1)
      })

      it("deleting a plan removes its leads", async () => {
        const planId = await plan(await partner())
        await api.post("/store/insurance/leads", leadBody(planId), store)
        expect((await api.get("/admin/insurance/plans", admin)).data.plans[0].lead_count).toBe(1)
        const res = await api.delete(`/admin/insurance/plans/${planId}`, admin)
        expect(res.data).toMatchObject({ deleted: true, leads_deleted: 1 })
        const insurance: InsuranceModuleService = getContainer().resolve(INSURANCE_MODULE)
        expect(await insurance.listInsuranceLeads({}, { withDeleted: true })).toHaveLength(0)
      })

      it("filters leads, changes status and notes, deletes, and exports CSV safely", async () => {
        const planId = await plan(await partner())
        const first = (await api.post("/store/insurance/leads", leadBody(planId, { customer_name: '=HYPERLINK("http://evil")', phone: "9000000020" }), store)).data.lead.id
        const second = (await api.post("/store/insurance/leads", leadBody(planId, { customer_name: "Meena, Pune", phone: "9000000021" }), store)).data.lead.id

        const updated = await api.post(`/admin/insurance/leads/${first}`, { status: "sent_to_partner", internal_notes: "Emailed partner" }, admin)
        expect(updated.data.lead).toMatchObject({ status: "sent_to_partner", internal_notes: "Emailed partner" })
        expect((await failure(api.post(`/admin/insurance/leads/${first}`, { status: "won" }, admin))).status).toBe(400)

        expect((await api.get("/admin/insurance/leads?status=sent_to_partner", admin)).data.leads.map((l: { id: string }) => l.id)).toEqual([first])
        expect((await api.get("/admin/insurance/leads?status=new", admin)).data.count).toBe(1)

        const csv = await api.get("/admin/insurance/leads/export", admin)
        expect(csv.headers["content-type"]).toMatch(/^text\/csv/)
        expect(csv.headers["content-disposition"]).toMatch(/attachment; filename="insurance-leads-\d{4}-\d{2}-\d{2}\.csv"/)
        const body = String(csv.data).replace(/^﻿/, "")
        const rows = body.trim().split("\r\n")
        expect(rows[0]).toMatch(/^Received \(India time\),Status,Name,Phone,/)
        expect(rows).toHaveLength(3)
        expect(body).toContain(`"'=HYPERLINK(""http://evil"")"`)
        expect(body).toContain('"Meena, Pune"')
        expect(body).toContain("Emailed partner")

        const filtered = String((await api.get("/admin/insurance/leads/export?status=new", admin)).data).trim().split("\r\n")
        expect(filtered).toHaveLength(2)
        expect((await failure(api.get("/admin/insurance/leads/export?from=yesterday", admin))).status).toBe(400)
        expect((await failure(api.get("/admin/insurance/leads/export", store))).status).toBe(401)

        expect((await api.delete(`/admin/insurance/leads/${second}`, admin)).data).toMatchObject({ deleted: true })
        expect((await api.get("/admin/insurance/leads", admin)).data.count).toBe(1)
      })
    })
  },
})
