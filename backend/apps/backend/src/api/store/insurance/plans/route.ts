import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INSURANCE_MODULE } from "../../../../modules/insurance"
import InsuranceModuleService from "../../../../modules/insurance/service"
import { matchesPlanFilters } from "../../../../modules/insurance/utils/rules"
import { publicPlan } from "../../../../modules/insurance/utils/serialize"
import { parsePlansQuery } from "../validators"

// Active plans of active partners, in Admin's sort order.
// Query: pet_type, pet_age_months (plans that cover a pet this old), max_premium (annual_premium_from at most this)
// The catalogue is small (a handful of partners), so the filters run in memory on the active plans; that keeps
// the "covers this pet" rule in one place (utils/rules.ts), shared with lead checks.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const filters = parsePlansQuery(req.query)
  const insurance: InsuranceModuleService = req.scope.resolve(INSURANCE_MODULE)
  const plans = await insurance.listInsurancePlans(
    { status: "active" },
    { relations: ["partner"], order: { sort_order: "ASC", name: "ASC" } }
  )
  const shown = plans.filter((p) => p.partner.status === "active" && matchesPlanFilters(p, filters))
  res.json({ plans: shown.map(publicPlan), count: shown.length })
}
