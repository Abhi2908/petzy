import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INSURANCE_MODULE } from "../../../../modules/insurance"
import InsuranceModuleService from "../../../../modules/insurance/service"
import { createInsurancePlanWorkflow } from "../../../../workflows/create-insurance-plan"
import { CreateInsurancePlanBody } from "../validators"

// Query: partner_id, status. Each plan comes with its partner and its lead count (for the delete warning).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const insurance: InsuranceModuleService = req.scope.resolve(INSURANCE_MODULE)
  const q = req.query as Record<string, string | undefined>
  const filters: Record<string, unknown> = {}
  if (q.partner_id) {
    filters.partner_id = q.partner_id
  }
  if (q.status) {
    filters.status = q.status
  }
  const plans = await insurance.listInsurancePlans(filters, {
    relations: ["partner"],
    order: { sort_order: "ASC", name: "ASC" },
  })
  const leads = plans.length
    ? await insurance.listInsuranceLeads({ plan_id: plans.map((p) => p.id) }, { select: ["id", "plan_id"] })
    : []
  const counts = new Map<string, number>()
  for (const lead of leads) {
    const planId = (lead as unknown as { plan_id: string }).plan_id
    counts.set(planId, (counts.get(planId) ?? 0) + 1)
  }
  res.json({ plans: plans.map((p) => ({ ...p, lead_count: counts.get(p.id) ?? 0 })), count: plans.length })
}

export async function POST(req: MedusaRequest<CreateInsurancePlanBody>, res: MedusaResponse) {
  const { result: id } = await createInsurancePlanWorkflow(req.scope).run({ input: req.validatedBody })
  const insurance: InsuranceModuleService = req.scope.resolve(INSURANCE_MODULE)
  res.status(201).json({ plan: await insurance.retrieveInsurancePlan(id, { relations: ["partner"] }) })
}
