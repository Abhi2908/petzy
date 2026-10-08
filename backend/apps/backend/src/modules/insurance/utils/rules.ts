// Insurance referral rules. Pure functions, no database access, so they can be unit tested.

export const DAILY_LEAD_LIMIT = 3
/** The daily limit looks back over the last 24 hours, not the calendar day, so midnight does not reset it. */
export const LEAD_WINDOW_MS = 24 * 60 * 60 * 1000

export type PlanLimits = {
  name: string
  pet_types: string[]
  min_age_months: number
  max_age_months: number
  annual_premium_from: number
}

export type PlanFilters = { pet_type?: string; pet_age_months?: number; max_premium?: number }

const PET_LABELS: Record<string, string> = { dog: "dogs", cat: "cats", bird: "birds", fish: "fish", other: "other pets" }

/**
 * The key the daily limit counts by: the last 10 digits of the phone number, so "+91 98111 22333",
 * "098111-22333" and "9811122333" are the same person. Numbers shorter than 10 digits keep all digits.
 */
export function phoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  return digits.length > 10 ? digits.slice(-10) : digits
}

/** "8 months", "1 year", "2 years 3 months" */
export function formatAge(months: number): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`
  if (months < 12) {
    return plural(months, "month")
  }
  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest ? `${plural(years, "year")} ${plural(rest, "month")}` : plural(years, "year")
}

function joinTypes(types: string[]): string {
  const labels = types.map((t) => PET_LABELS[t] ?? t)
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}` : labels[0] ?? "no pets"
}

/** Why a pet does not fit a plan, as a sentence for the customer, or null when it fits. */
export function planMismatch(plan: PlanLimits, petType: string, ageMonths: number): string | null {
  if (!plan.pet_types.includes(petType)) {
    return `${plan.name} covers ${joinTypes(plan.pet_types)} only.`
  }
  if (ageMonths < plan.min_age_months || ageMonths > plan.max_age_months) {
    return `${plan.name} covers pets aged ${formatAge(plan.min_age_months)} to ${formatAge(plan.max_age_months)}. Your pet is ${formatAge(ageMonths)}.`
  }
  return null
}

/** The public list filters: pet type, the pet's age and a premium ceiling. Unset filters match everything. */
export function matchesPlanFilters(plan: PlanLimits, filters: PlanFilters): boolean {
  if (filters.pet_type && !plan.pet_types.includes(filters.pet_type)) {
    return false
  }
  if (
    filters.pet_age_months !== undefined &&
    (filters.pet_age_months < plan.min_age_months || filters.pet_age_months > plan.max_age_months)
  ) {
    return false
  }
  if (filters.max_premium !== undefined && plan.annual_premium_from > filters.max_premium) {
    return false
  }
  return true
}

/** Checks a plan's own settings (Admin create and edit). Returns a message or null. */
export function planSettingsProblem(plan: {
  pet_types: string[]
  min_age_months: number
  max_age_months: number
}): string | null {
  if (!plan.pet_types.length) {
    return "Choose at least one pet type for the plan."
  }
  if (plan.max_age_months < plan.min_age_months) {
    return "The maximum age must be the same as or above the minimum age."
  }
  return null
}

/**
 * One CSV cell. Quotes when needed, and stops spreadsheet apps from running a cell as a formula: a cell
 * starting with =, +, -, @, tab or carriage return gets a leading apostrophe (OWASP's CSV injection advice).
 * Phone numbers written as "+91 ..." therefore appear as "'+91 ..." in the file.
 */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : value instanceof Date ? value.toISOString() : String(value)
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n"
}
