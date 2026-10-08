import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { INSURANCE_MODULE } from "../../../../../modules/insurance"
import InsuranceModuleService from "../../../../../modules/insurance/service"
import { publicPlan } from "../../../../../modules/insurance/utils/serialize"

// One plan, only while it and its partner are active.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const insurance: InsuranceModuleService = req.scope.resolve(INSURANCE_MODULE)
  const [plan] = await insurance.listInsurancePlans({ id: req.params.id, status: "active" }, { relations: ["partner"] })
  if (!plan || plan.partner.status !== "active") {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Insurance plan ${req.params.id} was not found`)
  }
  res.json({ plan: publicPlan(plan) })
}
