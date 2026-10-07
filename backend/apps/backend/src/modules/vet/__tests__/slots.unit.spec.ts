import { clinicDateOf, generateSlots, isValidDate, parseTime, validateWorkingHour, weekdayOf } from "../utils/slots"

// 2026-10-12 is a Monday. 09:00 IST is 03:30 UTC.
const MONDAY = "2026-10-12"
const hours = [{ weekday: 1, start_time: "09:00", end_time: "11:00" }]
const longAgo = new Date("2026-01-01T00:00:00Z")

describe("vet slots", () => {
  it("parses times and dates", () => {
    expect(parseTime("09:30")).toBe(570)
    expect(parseTime("9:30")).toBeNull()
    expect(parseTime("24:00")).toBeNull()
    expect(isValidDate("2026-02-29")).toBe(false)
    expect(isValidDate("2026-10-12")).toBe(true)
    expect(weekdayOf(MONDAY)).toBe(1)
  })

  it("turns clinic hours into UTC slots", () => {
    const slots = generateSlots({ date: MONDAY, slotMinutes: 30, hours, booked: [], now: longAgo })
    expect(slots.map((s) => s.starts_at)).toEqual([
      "2026-10-12T03:30:00.000Z",
      "2026-10-12T04:00:00.000Z",
      "2026-10-12T04:30:00.000Z",
      "2026-10-12T05:00:00.000Z",
    ])
    expect(slots[3].ends_at).toBe("2026-10-12T05:30:00.000Z")
  })

  it("returns nothing on a day without working hours", () => {
    expect(generateSlots({ date: "2026-10-13", slotMinutes: 30, hours, booked: [], now: longAgo })).toEqual([])
  })

  it("drops booked and past slots", () => {
    const slots = generateSlots({
      date: MONDAY,
      slotMinutes: 30,
      hours,
      booked: [{ starts_at: "2026-10-12T04:00:00.000Z", ends_at: "2026-10-12T04:30:00.000Z" }],
      now: new Date("2026-10-12T03:45:00Z"),
    })
    expect(slots.map((s) => s.starts_at)).toEqual(["2026-10-12T04:30:00.000Z", "2026-10-12T05:00:00.000Z"])
  })

  it("keeps slots from overlapping a booking made with a different slot length", () => {
    const slots = generateSlots({
      date: MONDAY,
      slotMinutes: 30,
      hours,
      booked: [{ starts_at: "2026-10-12T04:00:00.000Z", ends_at: "2026-10-12T05:00:00.000Z" }],
      now: longAgo,
    })
    expect(slots.map((s) => s.starts_at)).toEqual(["2026-10-12T03:30:00.000Z", "2026-10-12T05:00:00.000Z"])
  })

  it("merges overlapping shifts without duplicate slots", () => {
    const slots = generateSlots({
      date: MONDAY,
      slotMinutes: 60,
      hours: [
        { weekday: 1, start_time: "09:00", end_time: "11:00" },
        { weekday: 1, start_time: "10:00", end_time: "12:00" },
      ],
      booked: [],
      now: longAgo,
    })
    expect(slots).toHaveLength(3)
  })

  it("finds the clinic date of a moment (late evening UTC is already tomorrow in India)", () => {
    expect(clinicDateOf(new Date("2026-10-12T20:00:00Z"))).toBe("2026-10-13")
    expect(clinicDateOf(new Date("2026-10-12T03:30:00Z"))).toBe("2026-10-12")
  })

  it("validates working-hour blocks", () => {
    expect(validateWorkingHour({ weekday: 1, start_time: "09:00", end_time: "17:00" }, 30)).toBeNull()
    expect(validateWorkingHour({ weekday: 7, start_time: "09:00", end_time: "17:00" }, 30)).toMatch(/weekday/)
    expect(validateWorkingHour({ weekday: 1, start_time: "17:00", end_time: "09:00" }, 30)).toMatch(/after/)
    expect(validateWorkingHour({ weekday: 1, start_time: "09:00", end_time: "09:20" }, 30)).toMatch(/shorter/)
    expect(validateWorkingHour({ weekday: 1, start_time: "9am", end_time: "5pm" }, 30)).toMatch(/times/)
  })
})
