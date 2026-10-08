import { MedusaError } from "@medusajs/framework/utils"
import InsuranceModuleService from "../../modules/insurance/service"
import { planSettingsProblem } from "../../modules/insurance/utils/rules"

export async function getPartner(insurance: InsuranceModuleService, id: string) {
  const [partner] = await insurance.listInsurancePartners({ id })
  if (!partner) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Insurance partner ${id} was not found`)
  }
  return partner
}

export async function getPlan(insurance: InsuranceModuleService, id: string) {
  const [plan] = await insurance.listInsurancePlans({ id }, { relations: ["partner"] })
  if (!plan) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Insurance plan ${id} was not found`)
  }
  return plan
}

export function assertValidPlanSettings(plan: { pet_types: string[]; min_age_months: number; max_age_months: number }) {
  const problem = planSettingsProblem(plan)
  if (problem) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, problem)
  }
}

/** Permanently removes plans and every lead sent for them. */
export async function hardDeletePlans(insurance: InsuranceModuleService, planIds: string[]) {
  if (!planIds.length) {
    return { plans: 0, leads: 0 }
  }
  const leads = await insurance.listInsuranceLeads({ plan_id: planIds }, { select: ["id"] })
  if (leads.length) {
    await insurance.deleteInsuranceLeads(leads.map((l) => l.id))
  }
  await insurance.deleteInsurancePlans(planIds)
  return { plans: planIds.length, leads: leads.length }
}
