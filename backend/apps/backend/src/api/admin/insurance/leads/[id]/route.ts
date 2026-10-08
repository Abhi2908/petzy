import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INSURANCE_MODULE } from "../../../../../modules/insurance"
import InsuranceModuleService from "../../../../../modules/insurance/service"
import { deleteInsuranceLeadWorkflow } from "../../../../../workflows/delete-insurance-lead"
import { updateInsuranceLeadWorkflow } from "../../../../../workflows/update-insurance-lead"
import { UpdateInsuranceLeadBody } from "../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const insurance: InsuranceModuleService = req.scope.resolve(INSURANCE_MODULE)
  res.json({ lead: await insurance.retrieveInsuranceLead(req.params.id, { relations: ["plan", "plan.partner"] }) })
}

// Change the status and/or internal notes.
export async function POST(req: MedusaRequest<UpdateInsuranceLeadBody>, res: MedusaResponse) {
  await updateInsuranceLeadWorkflow(req.scope).run({ input: { ...req.validatedBody, id: req.params.id } })
  const insurance: InsuranceModuleService = req.scope.resolve(INSURANCE_MODULE)
  res.json({ lead: await insurance.retrieveInsuranceLead(req.params.id, { relations: ["plan", "plan.partner"] }) })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  await deleteInsuranceLeadWorkflow(req.scope).run({ input: req.params.id })
  res.json({ id: req.params.id, object: "insurance_lead", deleted: true })
}
