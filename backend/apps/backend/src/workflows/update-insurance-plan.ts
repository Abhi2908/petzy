import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { INSURANCE_MODULE } from "../modules/insurance"
import InsuranceModuleService from "../modules/insurance/service"
import { InsurancePlanInput } from "./create-insurance-plan"
import { assertValidPlanSettings, getPartner, getPlan } from "./steps/insurance-helpers"

export type UpdateInsurancePlanInput = { id: string } & Partial<InsurancePlanInput>

// Edits a plan, including activating, deactivating or moving it to another partner.
const updateInsurancePlanStep = createStep(
  "update-insurance-plan",
  async (input: UpdateInsurancePlanInput, { container }) => {
    const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
    const before = await getPlan(insurance, input.id)
    if (input.partner_id) {
      await getPartner(insurance, input.partner_id)
    }
    const merged = { ...before, ...input }
    assertValidPlanSettings(merged)
    await insurance.updateInsurancePlans({
      ...input,
      ...(input.pet_types ? { pet_types: [...new Set(input.pet_types)] } : {}),
    })
    const snapshot: Record<string, unknown> = { id: before.id }
    for (const key of Object.keys(input)) {
      snapshot[key] =
        key === "partner_id" ? before.partner.id : (before as unknown as Record<string, unknown>)[key]
    }
    return new StepResponse(input.id, snapshot)
  },
  async (snapshot, { container }) => {
    if (!snapshot) {
      return
    }
    const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
    await insurance.updateInsurancePlans(snapshot as { id: string })
  }
)

export const updateInsurancePlanWorkflow = createWorkflow(
  "update-insurance-plan",
  (input: UpdateInsurancePlanInput) => {
    const id = updateInsurancePlanStep(input)
    return new WorkflowResponse(id)
  }
)
