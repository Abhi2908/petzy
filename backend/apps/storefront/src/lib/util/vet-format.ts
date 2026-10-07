// Formatting for the vet booking page. Vet clinics are in India, so dates and
// times are always shown in India time, whatever the visitor's time zone is.
export const CLINIC_TIME_ZONE = "Asia/Kolkata"

export const MAX_BOOKING_DAYS_AHEAD = 60

/** The clinic-local calendar date (YYYY-MM-DD) of a moment in time. */
export function clinicDateOf(moment: Date): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(moment)
}

/** A YYYY-MM-DD date moved by a number of days. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** "2026-10-12" -> "Mon, 12 Oct 2026" */
export function formatClinicDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number)
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(new Date(Date.UTC(y, m - 1, d)))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value
  return `${part("weekday")}, ${part("day")} ${part("month")} ${part("year")}`
}

/** An ISO timestamp as clinic-local time, for example "10:30 am". */
export function formatClinicTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: CLINIC_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

/** Consultation fee in rupees, for example "Rs 1,200". */
export function formatFee(fee: number): string {
  return `Rs ${fee.toLocaleString("en-IN")}`
}
