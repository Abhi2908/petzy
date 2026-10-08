import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { INSURANCE_MODULE } from "../modules/insurance"
import InsuranceModuleService from "../modules/insurance/service"
import { getPlan, hardDeletePlans } from "./steps/insurance-helpers"

// Permanent delete: the plan and every lead sent for it.
const deleteInsurancePlanStep = createStep("delete-insurance-plan", async (id: string, { container }) => {
  const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
  await getPlan(insurance, id)
  const removed = await hardDeletePlans(insurance, [id])
  return new StepResponse({ id, leads: removed.leads })
})

export const deleteInsurancePlanWorkflow = createWorkflow("delete-insurance-plan", (id: string) => {
  const result = deleteInsurancePlanStep(id)
  return new WorkflowResponse(result)
})
