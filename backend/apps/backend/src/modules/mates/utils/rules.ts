// Mates marketplace rules. Pure functions, no database access, so they can be unit tested.
import { MedusaError } from "@medusajs/framework/utils"

export type Side = "buyer" | "seller"
export type OfferStatus = "open" | "countered" | "accepted" | "rejected" | "withdrawn"
export type ListingStatus = "pending_review" | "active" | "rejected" | "reserved" | "sold" | "expired" | "removed"
export type OfferAction = "accept" | "reject" | "counter" | "withdraw"

export const MAX_IMAGES = 8
export const LISTING_LIFETIME_DAYS = 60
const DAY_MS = 86_400_000

const notAllowed = (message: string) => new MedusaError(MedusaError.Types.NOT_ALLOWED, message)

export function isLive(status: OfferStatus): boolean {
  return status === "open" || status === "countered"
}

/** Whose move it is: the seller answers an open offer, the buyer answers a counter. */
export function turnOf(status: OfferStatus): Side | null {
  if (status === "open") {
    return "seller"
  }
  if (status === "countered") {
    return "buyer"
  }
  return null
}

/** Which side of an offer a customer is on, or null when they are not part of it. */
export function sideOf(
  customerId: string,
  offer: { buyer_customer_id: string },
  listing: { seller_customer_id: string }
): Side | null {
  if (customerId === offer.buyer_customer_id) {
    return "buyer"
  }
  if (customerId === listing.seller_customer_id) {
    return "seller"
  }
  return null
}

/**
 * Checks one offer action and returns the offer's new state. Accept and counter belong to the side whose
 * turn it is. Reject and withdraw are open to either side while the offer is live. Accepting and countering
 * also need the listing to be active (a listing under review, reserved or sold is frozen).
 */
export function applyOfferAction(input: {
  action: OfferAction
  side: Side
  status: OfferStatus
  listingStatus: ListingStatus
  amount?: number
}): { status: OfferStatus; last_actor: Side; amount?: number } {
  const { action, side, status, listingStatus, amount } = input
  if (!isLive(status)) {
    throw notAllowed(`This offer is already ${status}.`)
  }

  if (action === "reject") {
    return { status: "rejected", last_actor: side }
  }
  if (action === "withdraw") {
    return { status: "withdrawn", last_actor: side }
  }

  if (turnOf(status) !== side) {
    throw notAllowed(`It is the ${turnOf(status)}'s turn to respond to this offer.`)
  }
  if (listingStatus !== "active") {
    throw notAllowed("This listing is not open for offers right now.")
  }

  if (action === "accept") {
    return { status: "accepted", last_actor: side }
  }

  if (!Number.isInteger(amount) || (amount as number) <= 0) {
    throw notAllowed("A counter offer needs an amount greater than 0.")
  }
  return { status: side === "seller" ? "countered" : "open", last_actor: side, amount }
}

/** Checks that a buyer may make a new offer on a listing. */
export function assertCanMakeOffer(input: {
  buyerId: string
  amount: number
  listing: { seller_customer_id: string; status: ListingStatus; price_negotiable: boolean }
}) {
  const { buyerId, amount, listing } = input
  if (listing.status !== "active") {
    throw notAllowed("This listing is not open for offers right now.")
  }
  if (!listing.price_negotiable) {
    throw notAllowed("The seller is not taking offers on this listing.")
  }
  if (listing.seller_customer_id === buyerId) {
    throw notAllowed("You cannot make an offer on your own listing.")
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw notAllowed("The offer amount must be greater than 0.")
  }
}

/** Rules that look at more than one field, checked on create and on every edit. */
export function assertValidListing(listing: {
  pet_type: string
  breeder_registration_no?: string | null
  image_urls?: string[] | null
}) {
  if (listing.pet_type === "dog" && !listing.breeder_registration_no?.trim()) {
    throw notAllowed("A breeder registration number is required for dog listings.")
  }
  if ((listing.image_urls ?? []).length > MAX_IMAGES) {
    throw notAllowed(`A listing can have at most ${MAX_IMAGES} photos.`)
  }
}

/**
 * The status a listing moves to when its owner edits it. Edits go back to review so a moderator sees the
 * new text. Reserved, sold, expired and removed listings are closed and cannot be edited.
 */
export function statusAfterEdit(status: ListingStatus): ListingStatus {
  if (status === "pending_review" || status === "active" || status === "rejected") {
    return "pending_review"
  }
  throw notAllowed(`A ${status} listing cannot be edited.`)
}

export function expiresAtFrom(approvedAt: Date): Date {
  return new Date(approvedAt.getTime() + LISTING_LIFETIME_DAYS * DAY_MS)
}
