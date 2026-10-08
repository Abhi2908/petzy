import { MedusaError } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { INSURANCE_MODULE } from "../modules/insurance"
import InsuranceModuleService from "../modules/insurance/service"

// Permanent delete of one lead (for example spam, or a customer asking to be forgotten).
const deleteInsuranceLeadStep = createStep("delete-insurance-lead", async (id: string, { container }) => {
  const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
  const [lead] = await insurance.listInsuranceLeads({ id }, { select: ["id"] })
  if (!lead) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Lead ${id} was not found`)
  }
  await insurance.deleteInsuranceLeads(id)
  return new StepResponse(id)
})

export const deleteInsuranceLeadWorkflow = createWorkflow("delete-insurance-lead", (id: string) => {
  const deleted = deleteInsuranceLeadStep(id)
  return new WorkflowResponse(deleted)
})
