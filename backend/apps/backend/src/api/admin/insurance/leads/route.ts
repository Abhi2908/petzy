import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INSURANCE_MODULE } from "../../../../modules/insurance"
import InsuranceModuleService from "../../../../modules/insurance/service"
import { leadFilters } from "../helpers"

// Query: status (comma separated), plan_id, partner_id, from, to (India dates), limit, offset. Newest first.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const insurance: InsuranceModuleService = req.scope.resolve(INSURANCE_MODULE)
  const q = req.query as Record<string, string | undefined>
  const take = Math.min(Math.max(Number(q.limit) || 50, 1), 200)
  const skip = Math.max(Number(q.offset) || 0, 0)
  const [leads, count] = await insurance.listAndCountInsuranceLeads(await leadFilters(insurance, q), {
    relations: ["plan", "plan.partner"],
    order: { created_at: "DESC" },
    take,
    skip,
  })
  res.json({ leads, count, limit: take, offset: skip })
}
