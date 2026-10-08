import { csvCell, matchesPlanFilters, phoneKey, planMismatch, planSettingsProblem, toCsv } from "../utils/rules"

const plan = {
  name: "Complete Care",
  pet_types: ["dog", "cat"],
  min_age_months: 3,
  max_age_months: 96,
  annual_premium_from: 5499,
}

describe("insurance phone key", () => {
  it("treats the same Indian number written different ways as one", () => {
    const key = "9811122333"
    for (const phone of ["+91 98111 22333", "+91-98111-22333", "098111 22333", "9811122333", "91 9811122333"]) {
      expect(phoneKey(phone)).toBe(key)
    }
    expect(phoneKey("+91 98111 22334")).not.toBe(key)
    expect(phoneKey("22 334 455")).toBe("22334455")
  })
})

describe("insurance plan fit", () => {
  it("accepts a pet inside the plan's limits, including the edges", () => {
    expect(planMismatch(plan, "dog", 3)).toBeNull()
    expect(planMismatch(plan, "cat", 96)).toBeNull()
  })

  it("explains a pet type the plan does not cover", () => {
    expect(planMismatch(plan, "bird", 12)).toBe("Complete Care covers dogs and cats only.")
    expect(planMismatch({ ...plan, pet_types: ["bird", "other", "fish"] }, "dog", 12)).toBe(
      "Complete Care covers birds, other pets and fish only."
    )
  })

  it("explains an age outside the plan's range", () => {
    expect(planMismatch(plan, "dog", 2)).toBe("Complete Care covers pets aged 3 months to 8 years. Your pet is 2 months.")
    expect(planMismatch(plan, "dog", 97)).toBe("Complete Care covers pets aged 3 months to 8 years. Your pet is 8 years 1 month.")
  })
})

describe("insurance plan filters", () => {
  it("matches everything without filters", () => {
    expect(matchesPlanFilters(plan, {})).toBe(true)
  })

  it("filters by pet type, pet age and premium ceiling", () => {
    expect(matchesPlanFilters(plan, { pet_type: "dog" })).toBe(true)
    expect(matchesPlanFilters(plan, { pet_type: "fish" })).toBe(false)
    expect(matchesPlanFilters(plan, { pet_age_months: 3 })).toBe(true)
    expect(matchesPlanFilters(plan, { pet_age_months: 2 })).toBe(false)
    expect(matchesPlanFilters(plan, { pet_age_months: 97 })).toBe(false)
    expect(matchesPlanFilters(plan, { max_premium: 5499 })).toBe(true)
    expect(matchesPlanFilters(plan, { max_premium: 5498 })).toBe(false)
    expect(matchesPlanFilters(plan, { pet_type: "cat", pet_age_months: 0 })).toBe(false)
    expect(matchesPlanFilters(plan, { pet_age_months: 0, max_premium: 0 })).toBe(false)
  })
})

describe("insurance plan settings", () => {
  it("needs a pet type and a sensible age range", () => {
    expect(planSettingsProblem({ pet_types: [], min_age_months: 0, max_age_months: 10 })).toMatch(/at least one pet type/)
    expect(planSettingsProblem({ pet_types: ["dog"], min_age_months: 10, max_age_months: 9 })).toMatch(/maximum age/)
    expect(planSettingsProblem({ pet_types: ["dog"], min_age_months: 10, max_age_months: 10 })).toBeNull()
  })
})

describe("insurance CSV", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell('Says "hi", then\nleaves')).toBe('"Says ""hi"", then\nleaves"')
    expect(csvCell(null)).toBe("")
    expect(csvCell(42)).toBe("42")
  })

  it("stops cells from running as spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"")
    expect(csvCell("+91 98111 22333")).toBe("'+91 98111 22333")
    expect(csvCell("-1+1")).toBe("'-1+1")
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)")
    expect(csvCell("Bruno")).toBe("Bruno")
  })

  it("builds rows with CRLF line ends", () => {
    expect(toCsv(["a", "b"], [[1, "x,y"]])).toBe('a,b\r\n1,"x,y"\r\n')
  })
})
