// Small helpers for the Insurance screens: typed calls to /admin/insurance/* and display formatting.

export const PET_TYPES = [
  { value: "dog", label: "Dogs" },
  { value: "cat", label: "Cats" },
  { value: "bird", label: "Birds" },
  { value: "fish", label: "Fish" },
  { value: "other", label: "Other pets" },
] as const

export const LEAD_STATUSES = ["new", "contacted", "sent_to_partner", "converted", "closed"] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export type InsurancePartner = {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
  status: "active" | "inactive"
  plan_count?: number
  lead_count?: number
}

export type InsurancePlan = {
  id: string
  name: string
  description: string | null
  pet_types: string[]
  min_age_months: number
  max_age_months: number
  annual_premium_from: number
  cover_amount: number
  highlights: string[]
  exclusions: string[]
  status: "active" | "inactive"
  sort_order: number
  partner: InsurancePartner
  lead_count?: number
}

export type InsuranceLead = {
  id: string
  customer_name: string
  phone: string
  email: string | null
  pet_name: string | null
  pet_type: string
  breed: string | null
  pet_age_months: number
  city: string | null
  pincode: string | null
  message: string | null
  status: LeadStatus
  internal_notes: string | null
  created_at: string
  plan: InsurancePlan
}

export async function insuranceFetch<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const response = await fetch(`/admin/insurance${path}`, {
    method: init?.method ?? "GET",
    credentials: "include",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message ?? `Request failed (${response.status})`)
  }
  return data as T
}

/** Downloads the CSV export for the given filters as a file. */
export async function downloadLeadsCsv(query: string) {
  const response = await fetch(`/admin/insurance/leads/export?${query}`, { credentials: "include" })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.message ?? `Export failed (${response.status})`)
  }
  const name = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? "insurance-leads.csv"
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  sent_to_partner: "Sent to partner",
  converted: "Converted",
  closed: "Closed",
}

export const LEAD_STATUS_COLORS: Record<LeadStatus, "blue" | "orange" | "purple" | "green" | "grey"> = {
  new: "blue",
  contacted: "orange",
  sent_to_partner: "purple",
  converted: "green",
  closed: "grey",
}

export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`
}

export function formatAge(months: number): string {
  if (months < 12) {
    return `${months} mo`
  }
  const years = Math.floor(months / 12)
  const rest = months % 12
  return `${years} yr${rest ? ` ${rest} mo` : ""}`
}

export function petTypesLabel(types: string[]): string {
  return types.map((t) => PET_TYPES.find((p) => p.value === t)?.label ?? t).join(", ")
}

/** "8 Oct, 4:30 pm" in India time. */
export function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}
