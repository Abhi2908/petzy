import { EventClaims, handleOnce } from "../lib/once"

function memoryClaims(): EventClaims & { rows: Map<string, string | null> } {
  const rows = new Map<string, string | null>()
  return {
    rows,
    claim: async (id) => {
      if (rows.has(id)) {
        return false
      }
      rows.set(id, null)
      return true
    },
    release: async (id) => {
      rows.delete(id)
    },
    finish: async (id, result) => {
      rows.set(id, result)
    },
  }
}

describe("razorpay duplicate webhooks", () => {
  it("handles an event once and reports the repeat as a duplicate", async () => {
    const claims = memoryClaims()
    const handler = jest.fn().mockResolvedValue("order placed")
    expect(await handleOnce(claims, "evt_1", "payment.captured", handler)).toEqual({ status: "processed", result: "order placed" })
    expect(await handleOnce(claims, "evt_1", "payment.captured", handler)).toEqual({ status: "duplicate" })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(claims.rows.get("evt_1")).toBe("order placed")
  })

  it("lets a retry through when the first attempt failed", async () => {
    const claims = memoryClaims()
    const handler = jest.fn().mockRejectedValueOnce(new Error("Razorpay timeout")).mockResolvedValueOnce("order placed")
    await expect(handleOnce(claims, "evt_2", "payment.captured", handler)).rejects.toThrow("Razorpay timeout")
    expect(claims.rows.has("evt_2")).toBe(false)
    expect(await handleOnce(claims, "evt_2", "payment.captured", handler)).toEqual({ status: "processed", result: "order placed" })
  })

  it("lets only one of two simultaneous deliveries in", async () => {
    const claims = memoryClaims()
    const handler = jest.fn().mockResolvedValue("ok")
    const results = await Promise.all([handleOnce(claims, "evt_3", "x", handler), handleOnce(claims, "evt_3", "x", handler)])
    expect(results.map((r) => r.status).sort()).toEqual(["duplicate", "processed"])
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
