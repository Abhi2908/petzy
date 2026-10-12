import { fromPaise, toPaise } from "../lib/money"

describe("razorpay money conversion", () => {
  it("turns rupees into whole paise without floating point drift", () => {
    expect(toPaise(1499)).toBe(149900)
    expect(toPaise(1499.95)).toBe(149995)
    expect(toPaise(0.1 + 0.2)).toBe(30) // 0.30000000000000004
    expect(toPaise(19.99)).toBe(1999)
    expect(toPaise(1234567.89)).toBe(123456789)
    expect(toPaise("50")).toBe(5000)
    expect(toPaise("50.5")).toBe(5050)
    expect(toPaise(" 2998.00 ")).toBe(299800)
    expect(toPaise(0)).toBe(0)
  })

  it("rounds half up at the third decimal (taxes can leave more than two)", () => {
    expect(toPaise("1.004")).toBe(100)
    expect(toPaise("1.005")).toBe(101)
    expect(toPaise("1.0049999")).toBe(100)
    expect(toPaise(1.005)).toBe(101)
    expect(toPaise("99.999")).toBe(10000)
  })

  it("accepts Medusa's BigNumber shapes", () => {
    expect(toPaise({ numeric: 12.5, raw: { value: "12.5" }, toString: () => "12.5" })).toBe(1250)
    expect(toPaise({ toString: () => "7.25" })).toBe(725)
    expect(toPaise(10n)).toBe(1000)
    // A raw amount, as Medusa passes refunds: { value, precision }
    expect(toPaise({ value: "100.5", precision: 20 } as never)).toBe(10050)
    expect(toPaise({ valueOf: () => 42.42, toString: () => "[object Object]" })).toBe(4242)
  })

  it("refuses anything that is not a plain amount", () => {
    for (const bad of ["", "abc", "1,499", "1e3", "12.3.4", NaN, Infinity]) {
      expect(() => toPaise(bad as never)).toThrow()
    }
  })

  it("turns paise back into an exact rupee string", () => {
    expect(fromPaise(149995)).toBe("1499.95")
    expect(fromPaise(5)).toBe("0.05")
    expect(fromPaise(100)).toBe("1.00")
    expect(fromPaise(0)).toBe("0.00")
    expect(fromPaise(-250)).toBe("-2.50")
    expect(() => fromPaise(1.5)).toThrow()
  })

  it("round-trips", () => {
    for (const paise of [1, 99, 100, 149995, 123456789]) {
      expect(toPaise(fromPaise(paise))).toBe(paise)
    }
  })
})
