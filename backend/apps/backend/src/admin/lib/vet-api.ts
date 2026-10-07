// Small helpers for the vet screens: typed calls to /admin/vet/* and display formatting.
// The Admin signs in with a session cookie, so requests just include credentials.

export type WorkingHour = { id?: string; weekday: number; start_time: string; end_time: string }

export type VetProvider = {
  id: string
  name: string
  clinic_name: string
  city: string
  phone: string | null
  email: string | null
  specialties: string | null
  consultation_fee: number
  slot_minutes: number
  status: "active" | "inactive"
  working_hours: WorkingHour[]
  upcoming_appointments?: number
}

export const APPOINTMENT_STATUSES = ["booked", "confirmed", "completed", "cancelled", "no_show"] as const
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export type VetAppointment = {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  pet_name: string
  pet_type: string
  reason: string | null
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  notes: string | null
  provider: { id: string; name: string; clinic_name: string }
}

export async function vetFetch<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const response = await fetch(`/admin/vet${path}`, {
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

export const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
]

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  booked: "Booked",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
}

export const STATUS_COLORS: Record<AppointmentStatus, "blue" | "green" | "grey" | "red" | "orange"> = {
  booked: "blue",
  confirmed: "green",
  completed: "grey",
  cancelled: "red",
  no_show: "orange",
}

/** "Mon 12 Oct, 9:00 am" in clinic time (India), whatever the viewer's time zone. */
export function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`
}

/** "Mon-Fri 09:00-17:00" style summary is hard with split shifts, so list the days that are open. */
export function summariseHours(hours: WorkingHour[]): string {
  if (!hours.length) {
    return "No hours set"
  }
  const short = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const days = [...new Set(hours.map((h) => h.weekday))].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  return days.map((d) => short[d]).join(", ")
}
