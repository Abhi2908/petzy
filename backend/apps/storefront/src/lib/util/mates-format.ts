// Labels and formatting for the Mates marketplace pages. Dates are shown in India time.

export const PET_TYPES = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "bird", label: "Bird" },
  { value: "fish", label: "Fish" },
  { value: "other", label: "Other" },
] as const

export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const

export const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const

export const MAX_PHOTOS = 8
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"]
export const LISTINGS_PER_PAGE = 12

export const LISTING_STATUS: Record<
  string,
  { label: string; tone: "teal" | "coral" | "grey" | "red" }
> = {
  pending_review: { label: "Pending review", tone: "coral" },
  active: { label: "Active", tone: "teal" },
  rejected: { label: "Rejected", tone: "red" },
  reserved: { label: "Reserved", tone: "coral" },
  sold: { label: "Sold", tone: "grey" },
  expired: { label: "Expired", tone: "grey" },
  removed: { label: "Removed", tone: "red" },
}

export const OFFER_STATUS: Record<
  string,
  { label: string; tone: "teal" | "coral" | "grey" | "red" }
> = {
  open: { label: "Waiting for seller", tone: "coral" },
  countered: { label: "Waiting for buyer", tone: "coral" },
  accepted: { label: "Accepted", tone: "teal" },
  rejected: { label: "Rejected", tone: "grey" },
  withdrawn: { label: "Withdrawn", tone: "grey" },
}

export const petTypeLabel = (value: string) =>
  PET_TYPES.find((t) => t.value === value)?.label ?? value

/** Whole rupees, for example "₹35,000". */
export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`
}

/** "3 months", "1 year", "2 years 4 months" */
export function formatAge(months: number): string {
  const plural = (n: number, word: string) =>
    `${n} ${word}${n === 1 ? "" : "s"}`
  if (months < 12) {
    return plural(months, "month")
  }
  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest
    ? `${plural(years, "year")} ${plural(rest, "month")}`
    : plural(years, "year")
}

/** "7 Oct 2026" in India time. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso))
}

/** "7 Oct, 4:30 pm" in India time, for messages. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}
