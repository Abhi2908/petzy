import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { INSURANCE_MODULE } from "../modules/insurance"
import InsuranceModuleService from "../modules/insurance/service"
import { getPartner, hardDeletePlans } from "./steps/insurance-helpers"

// Permanent delete: the partner, all of its plans and every lead sent for those plans.
const deleteInsurancePartnerStep = createStep("delete-insurance-partner", async (id: string, { container }) => {
  const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
  await getPartner(insurance, id)
  const plans = await insurance.listInsurancePlans({ partner_id: id }, { select: ["id"] })
  const removed = await hardDeletePlans(
    insurance,
    plans.map((p) => p.id)
  )
  await insurance.deleteInsurancePartners(id)
  return new StepResponse({ id, ...removed })
})

export const deleteInsurancePartnerWorkflow = createWorkflow("delete-insurance-partner", (id: string) => {
  const result = deleteInsurancePartnerStep(id)
  return new WorkflowResponse(result)
})
