// Shapes Mates records for the Store API. Every store response goes through these allow-lists, so a new
// column never leaks by accident. Phone numbers and customer ids are left out everywhere except two places:
// the seller's own listing reads (GET /store/mates/my/listings and /my/listings/:id) show their seller_phone,
// and an accepted offer shows each side the other side's phone. Admin routes return full records instead.
import { Side, turnOf } from "./rules"

type ListingRecord = {
  id: string
  seller_customer_id: string
  title: string
  pet_type: string
  breed: string
  gender: string
  age_months: number
  color: string | null
  vaccinated: boolean
  dewormed: boolean
  has_papers: boolean
  description: string | null
  price: number
  price_negotiable: boolean
  city: string
  state: string
  pincode: string
  image_urls: string[]
  seller_type: string
  breeder_registration_no: string | null
  seller_phone: string
  status: string
  rejection_reason: string | null
  expires_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

type OfferRecord = {
  id: string
  buyer_customer_id: string
  buyer_phone: string
  amount: number
  status: string
  last_actor: string
  created_at: Date | string
  updated_at: Date | string
}

type MessageRecord = { id: string; sender: string; body: string; created_at: Date | string }

type ReportRecord = { id: string; reason: string; status: string; created_at: Date | string }

/** What anyone can see about a listing. */
export function publicListing(l: ListingRecord) {
  return {
    id: l.id,
    title: l.title,
    pet_type: l.pet_type,
    breed: l.breed,
    gender: l.gender,
    age_months: l.age_months,
    color: l.color,
    vaccinated: l.vaccinated,
    dewormed: l.dewormed,
    has_papers: l.has_papers,
    description: l.description,
    price: l.price,
    price_negotiable: l.price_negotiable,
    city: l.city,
    state: l.state,
    pincode: l.pincode,
    image_urls: l.image_urls ?? [],
    seller_type: l.seller_type,
    breeder_registration_no: l.breeder_registration_no,
    status: l.status,
    created_at: l.created_at,
  }
}

/** The seller's own view: adds moderation details. No phone: used for owner responses other than reads. */
export function ownListing(l: ListingRecord) {
  return {
    ...publicListing(l),
    rejection_reason: l.rejection_reason,
    expires_at: l.expires_at,
    updated_at: l.updated_at,
  }
}

/** Only for GET /store/mates/my/listings and /my/listings/:id, where the owner reads back their phone. */
export function ownListingWithPhone(l: ListingRecord) {
  return { ...ownListing(l), seller_phone: l.seller_phone }
}

/**
 * One offer as seen by one side. The other side's phone is added only when the offer is accepted:
 * the seller then sees buyer_phone and the buyer sees seller_phone.
 */
export function offerForSide(offer: OfferRecord, listing: ListingRecord, side: Side) {
  const turn = turnOf(offer.status as "open")
  const view: Record<string, unknown> = {
    id: offer.id,
    amount: offer.amount,
    status: offer.status,
    last_actor: offer.last_actor,
    your_side: side,
    your_turn: turn === side,
    created_at: offer.created_at,
    updated_at: offer.updated_at,
    listing: publicListing(listing),
  }
  if (offer.status === "accepted") {
    if (side === "seller") {
      view.buyer_phone = offer.buyer_phone
    } else {
      view.seller_phone = listing.seller_phone
    }
  }
  return view
}

export function publicMessage(m: MessageRecord) {
  return { id: m.id, sender: m.sender, body: m.body, created_at: m.created_at }
}

export function publicReport(r: ReportRecord) {
  return { id: r.id, reason: r.reason, status: r.status, created_at: r.created_at }
}
