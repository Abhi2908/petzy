import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INSURANCE_MODULE } from "../../../../../modules/insurance"
import InsuranceModuleService from "../../../../../modules/insurance/service"
import { deleteInsurancePlanWorkflow } from "../../../../../workflows/delete-insurance-plan"
import { updateInsurancePlanWorkflow } from "../../../../../workflows/update-insurance-plan"
import { UpdateInsurancePlanBody } from "../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const insurance: InsuranceModuleService = req.scope.resolve(INSURANCE_MODULE)
  res.json({ plan: await insurance.retrieveInsurancePlan(req.params.id, { relations: ["partner"] }) })
}

export async function POST(req: MedusaRequest<UpdateInsurancePlanBody>, res: MedusaResponse) {
  await updateInsurancePlanWorkflow(req.scope).run({ input: { ...req.validatedBody, id: req.params.id } })
  const insurance: InsuranceModuleService = req.scope.resolve(INSURANCE_MODULE)
  res.json({ plan: await insurance.retrieveInsurancePlan(req.params.id, { relations: ["partner"] }) })
}

// Permanent: also deletes the leads sent for this plan. The response says how many.
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { result } = await deleteInsurancePlanWorkflow(req.scope).run({ input: req.params.id })
  res.json({ id: req.params.id, object: "insurance_plan", deleted: true, leads_deleted: result.leads })
}
