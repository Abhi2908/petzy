import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INSURANCE_MODULE } from "../../../../modules/insurance"
import InsuranceModuleService from "../../../../modules/insurance/service"
import { createInsuranceLeadWorkflow } from "../../../../workflows/create-insurance-lead"
import { CreateInsuranceLeadBody } from "../validators"

// Ask a partner to get in touch about a plan. No account needed. The reply is a receipt only: the
// customer's own details and staff notes are not echoed back.
export async function POST(req: MedusaRequest<CreateInsuranceLeadBody>, res: MedusaResponse) {
  const { result: id } = await createInsuranceLeadWorkflow(req.scope).run({ input: req.validatedBody })
  const insurance: InsuranceModuleService = req.scope.resolve(INSURANCE_MODULE)
  const lead = await insurance.retrieveInsuranceLead(id, { relations: ["plan", "plan.partner"] })
  res.status(201).json({
    lead: {
      id: lead.id,
      status: lead.status,
      created_at: lead.created_at,
      plan: { id: lead.plan.id, name: lead.plan.name },
      partner: { name: lead.plan.partner.name },
    },
  })
}
