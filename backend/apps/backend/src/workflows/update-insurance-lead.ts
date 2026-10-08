import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { INSURANCE_MODULE } from "../modules/insurance"
import InsuranceModuleService from "../modules/insurance/service"

export type UpdateInsuranceLeadInput = {
  id: string
  status?: "new" | "contacted" | "sent_to_partner" | "converted" | "closed"
  internal_notes?: string | null
}

// Staff move a lead along (new -> contacted -> sent_to_partner -> converted or closed) and keep notes.
// Any status can follow any other, so a mistake is easy to undo.
const updateInsuranceLeadStep = createStep(
  "update-insurance-lead",
  async (input: UpdateInsuranceLeadInput, { container }) => {
    const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
    const [before] = await insurance.listInsuranceLeads({ id: input.id })
    if (!before) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Lead ${input.id} was not found`)
    }
    await insurance.updateInsuranceLeads(input)
    return new StepResponse(input.id, {
      id: before.id,
      status: before.status as UpdateInsuranceLeadInput["status"],
      internal_notes: before.internal_notes,
    })
  },
  async (snapshot, { container }) => {
    if (!snapshot) {
      return
    }
    const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
    await insurance.updateInsuranceLeads(snapshot)
  }
)

export const updateInsuranceLeadWorkflow = createWorkflow(
  "update-insurance-lead",
  (input: UpdateInsuranceLeadInput) => {
    const id = updateInsuranceLeadStep(input)
    return new WorkflowResponse(id)
  }
)
