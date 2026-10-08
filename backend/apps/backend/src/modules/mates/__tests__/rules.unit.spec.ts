import { MedusaError } from "@medusajs/framework/utils"
import {
  applyOfferAction,
  assertCanMakeOffer,
  assertValidListing,
  expiresAtFrom,
  sideOf,
  statusAfterEdit,
  turnOf,
} from "../utils/rules"

const notAllowed = (fn: () => unknown, message?: RegExp) => {
  try {
    fn()
  } catch (e) {
    expect((e as MedusaError).type).toBe(MedusaError.Types.NOT_ALLOWED)
    if (message) {
      expect((e as Error).message).toMatch(message)
    }
    return
  }
  throw new Error("expected NOT_ALLOWED")
}

const activeNegotiable = { seller_customer_id: "cus_seller", status: "active" as const, price_negotiable: true, price: 20000 }

describe("mates offer rules", () => {
  it("knows whose turn it is", () => {
    expect(turnOf("open")).toBe("seller")
    expect(turnOf("countered")).toBe("buyer")
    expect(turnOf("accepted")).toBeNull()
    expect(sideOf("cus_buyer", { buyer_customer_id: "cus_buyer" }, { seller_customer_id: "cus_seller" })).toBe("buyer")
    expect(sideOf("cus_seller", { buyer_customer_id: "cus_buyer" }, { seller_customer_id: "cus_seller" })).toBe("seller")
    expect(sideOf("cus_other", { buyer_customer_id: "cus_buyer" }, { seller_customer_id: "cus_seller" })).toBeNull()
  })

  it("lets only the side whose turn it is accept or counter", () => {
    const base = { listingStatus: "active" as const, priceNegotiable: true }
    expect(applyOfferAction({ ...base, action: "accept", side: "seller", status: "open" })).toEqual({ status: "accepted", last_actor: "seller" })
    expect(applyOfferAction({ ...base, action: "accept", side: "buyer", status: "countered" })).toEqual({ status: "accepted", last_actor: "buyer" })
    notAllowed(() => applyOfferAction({ ...base, action: "accept", side: "buyer", status: "open" }), /seller's turn/)
    notAllowed(() => applyOfferAction({ ...base, action: "counter", side: "seller", status: "countered", amount: 10 }), /buyer's turn/)
  })

  it("flips the turn on a counter and needs a positive whole amount", () => {
    const base = { listingStatus: "active" as const, priceNegotiable: true }
    expect(applyOfferAction({ ...base, action: "counter", side: "seller", status: "open", amount: 900 })).toEqual({
      status: "countered",
      last_actor: "seller",
      amount: 900,
    })
    expect(applyOfferAction({ ...base, action: "counter", side: "buyer", status: "countered", amount: 850 })).toEqual({
      status: "open",
      last_actor: "buyer",
      amount: 850,
    })
    notAllowed(() => applyOfferAction({ ...base, action: "counter", side: "seller", status: "open", amount: 0 }), /greater than 0/)
    notAllowed(() => applyOfferAction({ ...base, action: "counter", side: "seller", status: "open" }))
  })

  it("lets either side reject or withdraw while the offer is live", () => {
    const base = { listingStatus: "active" as const, priceNegotiable: true }
    for (const status of ["open", "countered"] as const) {
      for (const side of ["buyer", "seller"] as const) {
        expect(applyOfferAction({ ...base, action: "reject", side, status }).status).toBe("rejected")
        expect(applyOfferAction({ ...base, action: "withdraw", side, status }).status).toBe("withdrawn")
      }
    }
  })

  it("refuses every action once the offer is closed", () => {
    for (const status of ["accepted", "rejected", "withdrawn"] as const) {
      for (const action of ["accept", "reject", "counter", "withdraw"] as const) {
        notAllowed(() => applyOfferAction({ action, side: "seller", status, listingStatus: "active", priceNegotiable: true, amount: 5 }), /already/)
      }
    }
  })

  it("freezes accept and counter while the listing is not active", () => {
    for (const listingStatus of ["pending_review", "reserved", "sold"] as const) {
      notAllowed(() => applyOfferAction({ action: "accept", side: "seller", status: "open", listingStatus, priceNegotiable: true }), /not open for offers/)
      expect(applyOfferAction({ action: "withdraw", side: "buyer", status: "open", listingStatus, priceNegotiable: true }).status).toBe("withdrawn")
    }
  })

  it("takes only the listing price on a firm-price listing", () => {
    const firm = { ...activeNegotiable, price_negotiable: false }
    expect(() => assertCanMakeOffer({ buyerId: "cus_buyer", amount: 20000, listing: firm })).not.toThrow()
    notAllowed(() => assertCanMakeOffer({ buyerId: "cus_buyer", amount: 19999, listing: firm }), /firm price of ₹20,000/)
    notAllowed(() => assertCanMakeOffer({ buyerId: "cus_buyer", amount: 25000, listing: firm }), /exactly that amount/)
    notAllowed(() => assertCanMakeOffer({ buyerId: "cus_seller", amount: 20000, listing: firm }), /own listing/)
    // Negotiable listings keep taking any amount above 0.
    expect(() => assertCanMakeOffer({ buyerId: "cus_buyer", amount: 1, listing: activeNegotiable })).not.toThrow()
  })

  it("refuses counters on a firm-price listing but still allows accept, reject and withdraw", () => {
    const firm = { listingStatus: "active" as const, priceNegotiable: false }
    notAllowed(() => applyOfferAction({ ...firm, action: "counter", side: "seller", status: "open", amount: 100 }), /firm price/)
    expect(applyOfferAction({ ...firm, action: "accept", side: "seller", status: "open" }).status).toBe("accepted")
    expect(applyOfferAction({ ...firm, action: "reject", side: "seller", status: "open" }).status).toBe("rejected")
    expect(applyOfferAction({ ...firm, action: "withdraw", side: "buyer", status: "open" }).status).toBe("withdrawn")
  })

  it("checks a new offer", () => {
    expect(() => assertCanMakeOffer({ buyerId: "cus_buyer", amount: 500, listing: activeNegotiable })).not.toThrow()
    notAllowed(() => assertCanMakeOffer({ buyerId: "cus_seller", amount: 500, listing: activeNegotiable }), /own listing/)
    notAllowed(() => assertCanMakeOffer({ buyerId: "cus_buyer", amount: 0, listing: activeNegotiable }), /greater than 0/)
    notAllowed(() => assertCanMakeOffer({ buyerId: "cus_buyer", amount: -5, listing: activeNegotiable }), /greater than 0/)
    notAllowed(
      () => assertCanMakeOffer({ buyerId: "cus_buyer", amount: 500, listing: { ...activeNegotiable, status: "reserved" } }),
      /not open/
    )
  })
})

describe("mates listing rules", () => {
  it("needs a breeder registration number for dogs only", () => {
    notAllowed(() => assertValidListing({ pet_type: "dog", breeder_registration_no: null }), /breeder registration/)
    notAllowed(() => assertValidListing({ pet_type: "dog", breeder_registration_no: "   " }), /breeder registration/)
    expect(() => assertValidListing({ pet_type: "dog", breeder_registration_no: "KCI-1" })).not.toThrow()
    expect(() => assertValidListing({ pet_type: "cat" })).not.toThrow()
  })

  it("allows at most 8 photos", () => {
    const urls = (n: number) => Array.from({ length: n }, (_, i) => `https://x.test/${i}.jpg`)
    expect(() => assertValidListing({ pet_type: "cat", image_urls: urls(8) })).not.toThrow()
    notAllowed(() => assertValidListing({ pet_type: "cat", image_urls: urls(9) }), /at most 8/)
  })

  it("sends edits back to review and refuses edits on closed listings", () => {
    expect(statusAfterEdit("active")).toBe("pending_review")
    expect(statusAfterEdit("rejected")).toBe("pending_review")
    expect(statusAfterEdit("pending_review")).toBe("pending_review")
    for (const status of ["reserved", "sold", "expired", "removed"] as const) {
      notAllowed(() => statusAfterEdit(status), /cannot be edited/)
    }
  })

  it("expires listings 60 days after approval", () => {
    expect(expiresAtFrom(new Date("2026-10-07T00:00:00Z")).toISOString()).toBe("2026-12-06T00:00:00.000Z")
  })
})
