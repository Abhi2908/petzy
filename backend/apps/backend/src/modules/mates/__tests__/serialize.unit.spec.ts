import { offerForSide, ownListing, publicListing, publicMessage, publicReport } from "../utils/serialize"

const SELLER_PHONE = "+91 91111 11111"
const BUYER_PHONE = "+91 92222 22222"

const listing = {
  id: "matl_1",
  seller_customer_id: "cus_seller",
  title: "Beagle puppy",
  pet_type: "dog",
  breed: "Beagle",
  gender: "male",
  age_months: 3,
  color: null,
  vaccinated: true,
  dewormed: true,
  has_papers: false,
  description: null,
  price: 20000,
  price_negotiable: true,
  city: "Pune",
  state: "Maharashtra",
  pincode: "411001",
  image_urls: [],
  seller_type: "breeder",
  breeder_registration_no: "KCI-1",
  seller_phone: SELLER_PHONE,
  status: "active",
  rejection_reason: null,
  expires_at: null,
  created_at: "2026-10-07T00:00:00Z",
  updated_at: "2026-10-07T00:00:00Z",
}

const offer = (status: string) => ({
  id: "mato_1",
  buyer_customer_id: "cus_buyer",
  buyer_phone: BUYER_PHONE,
  amount: 18000,
  status,
  last_actor: "buyer",
  created_at: "2026-10-07T00:00:00Z",
  updated_at: "2026-10-07T00:00:00Z",
})

const text = (value: unknown) => JSON.stringify(value)

describe("mates phone privacy (serializers)", () => {
  it("never puts a phone number or customer id in listing views", () => {
    for (const view of [publicListing(listing), ownListing(listing)]) {
      expect(text(view)).not.toContain(SELLER_PHONE)
      expect(text(view)).not.toContain("cus_seller")
      expect(view).not.toHaveProperty("seller_phone")
      expect(view).not.toHaveProperty("seller_customer_id")
    }
  })

  it("hides both phones on offers that are not accepted, for both sides", () => {
    for (const status of ["open", "countered", "rejected", "withdrawn"]) {
      for (const side of ["buyer", "seller"] as const) {
        const view = text(offerForSide(offer(status), listing, side))
        expect(view).not.toContain(SELLER_PHONE)
        expect(view).not.toContain(BUYER_PHONE)
        expect(view).not.toContain("cus_buyer")
        expect(view).not.toContain("cus_seller")
      }
    }
  })

  it("shows each side only the other side's phone once accepted", () => {
    const seller = offerForSide(offer("accepted"), listing, "seller")
    expect(seller.buyer_phone).toBe(BUYER_PHONE)
    expect(text(seller)).not.toContain(SELLER_PHONE)

    const buyer = offerForSide(offer("accepted"), listing, "buyer")
    expect(buyer.seller_phone).toBe(SELLER_PHONE)
    expect(text(buyer)).not.toContain(BUYER_PHONE)
  })

  it("keeps messages and reports free of contact details", () => {
    const message = publicMessage({ id: "matm_1", sender: "buyer", body: "Hi", created_at: "x", ...{ offer: offer("accepted") } } as never)
    expect(text(message)).not.toContain(BUYER_PHONE)
    const report = publicReport({ id: "matr_1", reason: "Fake", status: "open", created_at: "x", reporter_customer_id: "cus_buyer" } as never)
    expect(text(report)).not.toContain("cus_buyer")
  })
})
