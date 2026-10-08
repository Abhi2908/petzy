import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { INSURANCE_MODULE } from "../modules/insurance"
import InsuranceModuleService from "../modules/insurance/service"
import { InsurancePartnerInput } from "./create-insurance-partner"
import { getPartner } from "./steps/insurance-helpers"

export type UpdateInsurancePartnerInput = { id: string } & Partial<InsurancePartnerInput>

// Edits a partner, including activating or deactivating it. An inactive partner's plans disappear from
// the store; its leads stay in Admin.
const updateInsurancePartnerStep = createStep(
  "update-insurance-partner",
  async (input: UpdateInsurancePartnerInput, { container }) => {
    const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
    const before = await getPartner(insurance, input.id)
    await insurance.updateInsurancePartners(input)
    const snapshot: Record<string, unknown> = { id: before.id }
    for (const key of Object.keys(input)) {
      snapshot[key] = (before as Record<string, unknown>)[key]
    }
    return new StepResponse(input.id, snapshot)
  },
  async (snapshot, { container }) => {
    if (!snapshot) {
      return
    }
    const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
    await insurance.updateInsurancePartners(snapshot as { id: string })
  }
)

export const updateInsurancePartnerWorkflow = createWorkflow(
  "update-insurance-partner",
  (input: UpdateInsurancePartnerInput) => {
    const id = updateInsurancePartnerStep(input)
    return new WorkflowResponse(id)
  }
)
