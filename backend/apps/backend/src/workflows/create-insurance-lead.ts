import { MedusaError, Modules } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { INSURANCE_MODULE } from "../modules/insurance"
import InsuranceModuleService from "../modules/insurance/service"
import { DAILY_LEAD_LIMIT, LEAD_WINDOW_MS, phoneKey, planMismatch } from "../modules/insurance/utils/rules"

export type CreateInsuranceLeadInput = {
  plan_id: string
  customer_name: string
  phone: string
  email?: string | null
  pet_name?: string | null
  pet_type: string
  breed?: string | null
  pet_age_months: number
  city?: string | null
  pincode?: string | null
  message?: string | null
}

const notAllowed = (message: string) => new MedusaError(MedusaError.Types.NOT_ALLOWED, message)

// A customer (guest or signed in) asks to hear from a partner about one plan.
//   - the plan and its partner must be active;
//   - the pet's type and age must fit the plan;
//   - at most 3 requests per phone number in 24 hours, counted by the last 10 digits of the number.
// The count and the insert run under a lock on that number, so parallel requests cannot slip past the limit.
const createInsuranceLeadStep = createStep(
  "create-insurance-lead",
  async (input: CreateInsuranceLeadInput, { container }) => {
    const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
    const locking = container.resolve(Modules.LOCKING)

    const [plan] = await insurance.listInsurancePlans({ id: input.plan_id }, { relations: ["partner"] })
    if (!plan || plan.status !== "active" || plan.partner.status !== "active") {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "This insurance plan is not available right now.")
    }
    const mismatch = planMismatch(plan, input.pet_type, input.pet_age_months)
    if (mismatch) {
      throw notAllowed(mismatch)
    }

    const key = phoneKey(input.phone)
    if (key.length < 7) {
      throw notAllowed("Enter a valid phone number so the partner can call you.")
    }

    const id = await locking.execute(`insurance-lead:${key}`, async () => {
      const recent = await insurance.listInsuranceLeads(
        { phone_key: key, created_at: { $gt: new Date(Date.now() - LEAD_WINDOW_MS) } },
        { select: ["id"] }
      )
      if (recent.length >= DAILY_LEAD_LIMIT) {
        throw notAllowed(
          `You have already sent ${DAILY_LEAD_LIMIT} requests in the last 24 hours from this phone number. Please try again tomorrow.`
        )
      }
      const lead = await insurance.createInsuranceLeads({ ...input, phone_key: key, status: "new" })
      return lead.id
    })
    return new StepResponse(id, id)
  },
  async (id, { container }) => {
    if (!id) {
      return
    }
    const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
    await insurance.deleteInsuranceLeads(id)
  }
)

export const createInsuranceLeadWorkflow = createWorkflow(
  "create-insurance-lead",
  (input: CreateInsuranceLeadInput) => {
    const id = createInsuranceLeadStep(input)
    return new WorkflowResponse(id)
  }
)
