import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INSURANCE_MODULE } from "../../../../modules/insurance"
import InsuranceModuleService from "../../../../modules/insurance/service"
import { createInsurancePartnerWorkflow } from "../../../../workflows/create-insurance-partner"
import { CreateInsurancePartnerBody } from "../validators"

// All partners, with how many plans and leads each has (the Admin delete warning shows these).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const insurance: InsuranceModuleService = req.scope.resolve(INSURANCE_MODULE)
  const partners = await insurance.listInsurancePartners({}, { relations: ["plans"], order: { name: "ASC" } })
  const planIds = partners.flatMap((p) => p.plans.map((pl) => pl.id))
  const leads = planIds.length ? await insurance.listInsuranceLeads({ plan_id: planIds }, { select: ["id", "plan_id"] }) : []
  const leadsByPlan = new Map<string, number>()
  for (const lead of leads) {
    const planId = (lead as unknown as { plan_id: string }).plan_id
    leadsByPlan.set(planId, (leadsByPlan.get(planId) ?? 0) + 1)
  }
  res.json({
    partners: partners.map(({ plans, ...p }) => ({
      ...p,
      plan_count: plans.length,
      lead_count: plans.reduce((n, pl) => n + (leadsByPlan.get(pl.id) ?? 0), 0),
    })),
    count: partners.length,
  })
}

export async function POST(req: MedusaRequest<CreateInsurancePartnerBody>, res: MedusaResponse) {
  const { result: id } = await createInsurancePartnerWorkflow(req.scope).run({ input: req.validatedBody })
  const insurance: InsuranceModuleService = req.scope.resolve(INSURANCE_MODULE)
  res.status(201).json({ partner: await insurance.retrieveInsurancePartner(id) })
}
