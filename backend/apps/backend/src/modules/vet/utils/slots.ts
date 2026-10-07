// Slot maths for vet appointments. Pure functions, no database access.
// Working hours are clinic local time. India has a single time zone (IST, UTC+05:30, no daylight saving).

export const CLINIC_UTC_OFFSET_MINUTES = 330

export type WorkingHour = { weekday: number; start_time: string; end_time: string }
export type Slot = { starts_at: string; ends_at: string }
export type BookedRange = { starts_at: Date | string; ends_at: Date | string }

const MINUTE_MS = 60_000

/** "09:30" -> 570. Returns null when the text is not a valid HH:MM time. */
export function parseTime(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

/** True for a real calendar date written as YYYY-MM-DD. */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const [y, m, d] = value.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/** Weekday of a YYYY-MM-DD date: 0 = Sunday ... 6 = Saturday. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** The clinic-local calendar date (YYYY-MM-DD) of a moment in time. */
export function clinicDateOf(moment: Date): string {
  return new Date(moment.getTime() + CLINIC_UTC_OFFSET_MINUTES * MINUTE_MS).toISOString().slice(0, 10)
}

/** Checks one working-hour block: valid times, end after start, long enough for one slot. */
export function validateWorkingHour(hour: WorkingHour, slotMinutes: number): string | null {
  if (!Number.isInteger(hour.weekday) || hour.weekday < 0 || hour.weekday > 6) {
    return "weekday must be a whole number from 0 (Sunday) to 6 (Saturday)"
  }
  const start = parseTime(hour.start_time)
  const end = parseTime(hour.end_time)
  if (start === null || end === null) {
    return `times must look like 09:00 (got ${hour.start_time} - ${hour.end_time})`
  }
  if (end <= start) {
    return `end time ${hour.end_time} must be after start time ${hour.start_time}`
  }
  if (end - start < slotMinutes) {
    return `${hour.start_time} - ${hour.end_time} is shorter than one ${slotMinutes} minute slot`
  }
  return null
}

/**
 * All bookable slots for one clinic-local date: every slot inside the working hours of that weekday,
 * minus slots that start in the past or overlap an existing live appointment.
 */
export function generateSlots(input: {
  date: string
  slotMinutes: number
  hours: WorkingHour[]
  booked: BookedRange[]
  now: Date
}): Slot[] {
  const { date, slotMinutes, hours, booked, now } = input
  if (!isValidDate(date) || slotMinutes <= 0) {
    return []
  }

  const [y, m, d] = date.split("-").map(Number)
  const localMidnightUtc = Date.UTC(y, m - 1, d) - CLINIC_UTC_OFFSET_MINUTES * MINUTE_MS
  const weekday = weekdayOf(date)
  const bookedRanges = booked.map((b) => ({ start: new Date(b.starts_at).getTime(), end: new Date(b.ends_at).getTime() }))

  const starts = new Set<number>()
  for (const hour of hours) {
    if (hour.weekday !== weekday) {
      continue
    }
    const from = parseTime(hour.start_time)
    const to = parseTime(hour.end_time)
    if (from === null || to === null) {
      continue
    }
    for (let t = from; t + slotMinutes <= to; t += slotMinutes) {
      starts.add(localMidnightUtc + t * MINUTE_MS)
    }
  }

  return [...starts]
    .sort((a, b) => a - b)
    .filter((start) => start > now.getTime())
    .filter((start) => {
      const end = start + slotMinutes * MINUTE_MS
      return !bookedRanges.some((b) => b.start < end && b.end > start)
    })
    .map((start) => ({
      starts_at: new Date(start).toISOString(),
      ends_at: new Date(start + slotMinutes * MINUTE_MS).toISOString(),
    }))
}
