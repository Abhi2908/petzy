import { MedusaError } from "@medusajs/framework/utils"
import InsuranceModuleService from "../../../modules/insurance/service"

const DAY_MS = 86_400_000
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))
// India midnight (UTC+05:30) of a YYYY-MM-DD date.
const indiaDayStart = (v: string) => new Date(Date.parse(`${v}T00:00:00Z`) - 330 * 60_000)

/**
 * Lead filters shared by the list and the CSV export.
 * Query: status (comma separated), plan_id, partner_id, from / to (YYYY-MM-DD, India dates, inclusive)
 */
export async function leadFilters(insurance: InsuranceModuleService, q: Record<string, string | undefined>) {
  const filters: Record<string, unknown> = {}
  if (q.status) {
    filters.status = q.status.split(",")
  }
  if (q.plan_id) {
    filters.plan_id = q.plan_id
  } else if (q.partner_id) {
    const plans = await insurance.listInsurancePlans({ partner_id: q.partner_id }, { select: ["id"] })
    filters.plan_id = plans.map((p) => p.id)
  }
  const range: Record<string, Date> = {}
  for (const [key, value] of [["from", q.from], ["to", q.to]] as const) {
    if (value && !isDate(value)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `${key} must be a date like 2026-10-12`)
    }
  }
  if (q.from) {
    range.$gte = indiaDayStart(q.from)
  }
  if (q.to) {
    range.$lt = new Date(indiaDayStart(q.to).getTime() + DAY_MS)
  }
  if (Object.keys(range).length) {
    filters.created_at = range
  }
  return filters
}
