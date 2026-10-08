import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INSURANCE_MODULE } from "../../../../../modules/insurance"
import InsuranceModuleService from "../../../../../modules/insurance/service"
import { deleteInsurancePartnerWorkflow } from "../../../../../workflows/delete-insurance-partner"
import { updateInsurancePartnerWorkflow } from "../../../../../workflows/update-insurance-partner"
import { UpdateInsurancePartnerBody } from "../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const insurance: InsuranceModuleService = req.scope.resolve(INSURANCE_MODULE)
  res.json({ partner: await insurance.retrieveInsurancePartner(req.params.id, { relations: ["plans"] }) })
}

export async function POST(req: MedusaRequest<UpdateInsurancePartnerBody>, res: MedusaResponse) {
  await updateInsurancePartnerWorkflow(req.scope).run({ input: { ...req.validatedBody, id: req.params.id } })
  const insurance: InsuranceModuleService = req.scope.resolve(INSURANCE_MODULE)
  res.json({ partner: await insurance.retrieveInsurancePartner(req.params.id) })
}

// Permanent: also deletes the partner's plans and their leads. The response says how many.
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { result } = await deleteInsurancePartnerWorkflow(req.scope).run({ input: req.params.id })
  res.json({ id: req.params.id, object: "insurance_partner", deleted: true, plans_deleted: result.plans, leads_deleted: result.leads })
}
