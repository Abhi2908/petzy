// Small helpers for the Mates screens: typed calls to /admin/mates/* and display formatting.
// Admin sees full records, phone numbers included.

export const LISTING_STATUSES = ["pending_review", "active", "rejected", "reserved", "sold", "expired", "removed"] as const
export type ListingStatus = (typeof LISTING_STATUSES)[number]

export const OFFER_STATUSES = ["open", "countered", "accepted", "rejected", "withdrawn"] as const
export type OfferStatus = (typeof OFFER_STATUSES)[number]

export type MatesListing = {
  id: string
  seller_customer_id: string
  title: string
  pet_type: string
  breed: string
  gender: string
  age_months: number
  color: string | null
  vaccinated: boolean
  dewormed: boolean
  has_papers: boolean
  description: string | null
  price: number
  price_negotiable: boolean
  city: string
  state: string
  pincode: string
  image_urls: string[]
  seller_type: "individual" | "breeder"
  breeder_registration_no: string | null
  seller_phone: string
  status: ListingStatus
  rejection_reason: string | null
  expires_at: string | null
  created_at: string
  open_reports?: number
  offers?: MatesOffer[]
  reports?: MatesReport[]
}

export type MatesOffer = {
  id: string
  buyer_customer_id: string
  buyer_phone: string
  amount: number
  status: OfferStatus
  last_actor: "buyer" | "seller"
  created_at: string
  updated_at: string
  listing?: MatesListing
  messages?: MatesMessage[]
}

export type MatesMessage = { id: string; sender: "buyer" | "seller"; body: string; created_at: string }

export type MatesReport = {
  id: string
  reporter_customer_id: string
  reason: string
  status: "open" | "resolved"
  created_at: string
  listing?: MatesListing
}

export async function matesFetch<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const response = await fetch(`/admin/mates${path}`, {
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

type BadgeColor = "blue" | "green" | "grey" | "red" | "orange" | "purple"

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  pending_review: "Waiting for review",
  active: "Active",
  rejected: "Rejected",
  reserved: "Reserved",
  sold: "Sold",
  expired: "Expired",
  removed: "Removed",
}

export const LISTING_STATUS_COLORS: Record<ListingStatus, BadgeColor> = {
  pending_review: "orange",
  active: "green",
  rejected: "red",
  reserved: "blue",
  sold: "purple",
  expired: "grey",
  removed: "red",
}

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  open: "Waiting for seller",
  countered: "Waiting for buyer",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
}

export const OFFER_STATUS_COLORS: Record<OfferStatus, BadgeColor> = {
  open: "orange",
  countered: "blue",
  accepted: "green",
  rejected: "red",
  withdrawn: "grey",
}

export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`
}

/** "12 Oct 2026" in India time. */
export function formatDate(iso: string | null): string {
  if (!iso) {
    return "-"
  }
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso)
  )
}

export function formatAge(months: number): string {
  if (months < 12) {
    return `${months} month${months === 1 ? "" : "s"}`
  }
  const years = Math.floor(months / 12)
  const rest = months % 12
  return `${years} yr${rest ? ` ${rest} mo` : ""}`
}
