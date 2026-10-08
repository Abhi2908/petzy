import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { INSURANCE_MODULE } from "../modules/insurance"
import InsuranceModuleService from "../modules/insurance/service"
import { assertValidPlanSettings, getPartner } from "./steps/insurance-helpers"

export type InsurancePlanInput = {
  partner_id: string
  name: string
  description?: string | null
  pet_types: string[]
  min_age_months: number
  max_age_months: number
  annual_premium_from: number
  cover_amount: number
  highlights?: string[]
  exclusions?: string[]
  status?: "active" | "inactive"
  sort_order?: number
}

const createInsurancePlanStep = createStep(
  "create-insurance-plan",
  async (input: InsurancePlanInput, { container }) => {
    const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
    await getPartner(insurance, input.partner_id)
    assertValidPlanSettings(input)
    const plan = await insurance.createInsurancePlans({
      ...input,
      pet_types: [...new Set(input.pet_types)],
      highlights: input.highlights ?? [],
      exclusions: input.exclusions ?? [],
    })
    return new StepResponse(plan.id, plan.id)
  },
  async (id, { container }) => {
    if (!id) {
      return
    }
    const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
    await insurance.deleteInsurancePlans(id)
  }
)

export const createInsurancePlanWorkflow = createWorkflow("create-insurance-plan", (input: InsurancePlanInput) => {
  const id = createInsurancePlanStep(input)
  return new WorkflowResponse(id)
})
