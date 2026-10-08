"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

export type PetType = "dog" | "cat" | "bird" | "fish" | "other"
export type ListingStatus =
  | "pending_review"
  | "active"
  | "rejected"
  | "reserved"
  | "sold"
  | "expired"
  | "removed"
export type OfferStatus =
  | "open"
  | "countered"
  | "accepted"
  | "rejected"
  | "withdrawn"
export type Side = "buyer" | "seller"

export type MatesListing = {
  id: string
  title: string
  pet_type: PetType
  breed: string
  gender: "male" | "female"
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
  seller_type: "individual" | "breeder"
  breeder_registration_no: string | null
  status: ListingStatus
  created_at: string
}

/** The owner's view. seller_phone is only present on the "my listings" list. */
export type MyMatesListing = MatesListing & {
  rejection_reason: string | null
  expires_at: string | null
  updated_at: string
  seller_phone?: string
}

/** One offer as the logged-in customer sees it. The other side's phone appears only once accepted. */
export type MatesOffer = {
  id: string
  amount: number
  status: OfferStatus
  last_actor: Side
  your_side: Side
  your_turn: boolean
  created_at: string
  updated_at: string
  listing: MatesListing
  buyer_phone?: string
  seller_phone?: string
}

export type MatesMessage = {
  id: string
  sender: Side
  body: string
  created_at: string
}

export type ListingInput = {
  title: string
  pet_type: PetType
  breed: string
  gender: "male" | "female"
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
  seller_type: "individual" | "breeder"
  breeder_registration_no: string | null
  seller_phone: string
}

// Results are returned rather than thrown: Next.js hides the message of an error thrown from a server
// action in production, and the API messages ("You cannot make an offer on your own listing") are meant
// for the customer. `status` lets pages tell "not found" apart from other failures.
export type Result<T> =
  | { data: T; error?: never; status?: never }
  | { data?: never; error: string; status?: number }

const failed = (error: unknown): { error: string; status?: number } => {
  const e = error as { message?: string; status?: number }
  return {
    error: e?.message || "Something went wrong. Please try again.",
    status: typeof e?.status === "number" ? e.status : undefined,
  }
}

// Every call is uncached: listings, offers and messages change with each action.
async function call<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "DELETE"
    body?: Record<string, unknown>
    query?: Record<string, string>
    auth?: boolean
  } = {}
): Promise<Result<T>> {
  try {
    const headers = options.auth === false ? {} : await getAuthHeaders()
    const data = await sdk.client.fetch<T>(path, {
      method: options.method ?? "GET",
      body: options.body,
      query: options.query,
      headers,
      cache: "no-store",
    })
    return { data }
  } catch (error) {
    return failed(error)
  }
}

// Public browsing

export const listMatesListings = async (query: Record<string, string>) =>
  call<{
    listings: MatesListing[]
    count: number
    limit: number
    offset: number
  }>("/store/mates/listings", { query, auth: false })

export const getMatesListing = async (id: string) =>
  call<{ listing: MatesListing }>(`/store/mates/listings/${id}`, {
    auth: false,
  })

// The seller's own listings

export const listMyMatesListings = async () =>
  call<{ listings: MyMatesListing[]; count: number }>(
    "/store/mates/my/listings"
  )

export const createMatesListing = async (input: ListingInput) =>
  call<{ listing: MyMatesListing }>("/store/mates/listings", {
    method: "POST",
    body: input,
  })

export const updateMatesListing = async (
  id: string,
  input: Partial<ListingInput>
) =>
  call<{ listing: MyMatesListing }>(`/store/mates/my/listings/${id}`, {
    method: "POST",
    body: input,
  })

export const markMatesListingSold = async (id: string) =>
  call<{ listing: MyMatesListing }>(`/store/mates/my/listings/${id}/sold`, {
    method: "POST",
  })

export const releaseMatesListing = async (id: string) =>
  call<{ listing: MyMatesListing }>(`/store/mates/my/listings/${id}/release`, {
    method: "POST",
  })

export const deleteMatesListing = async (id: string) =>
  call<{ id: string; deleted: boolean }>(`/store/mates/my/listings/${id}`, {
    method: "DELETE",
  })

export const reportMatesListing = async (id: string, reason: string) =>
  call<{ report: { id: string } }>(`/store/mates/listings/${id}/report`, {
    method: "POST",
    body: { reason },
  })

// Offers and messages

/**
 * Makes an offer and, when the buyer wrote one, posts their first message on it. If only the message
 * fails, the offer still stands, so it is returned with `messageError` set.
 */
export const makeMatesOffer = async (
  listingId: string,
  input: { amount: number; buyer_phone: string; message?: string }
): Promise<Result<{ offer: MatesOffer; messageError?: string }>> => {
  const created = await call<{ offer: MatesOffer }>(
    `/store/mates/listings/${listingId}/offers`,
    {
      method: "POST",
      body: { amount: input.amount, buyer_phone: input.buyer_phone },
    }
  )
  if (created.error !== undefined) {
    return created
  }
  const message = input.message?.trim()
  if (message) {
    const posted = await postMatesMessage(created.data.offer.id, message)
    if (posted.error !== undefined) {
      return { data: { offer: created.data.offer, messageError: posted.error } }
    }
  }
  return { data: { offer: created.data.offer } }
}

export const listMyMatesOffers = async (status?: string) =>
  call<{ offers: MatesOffer[]; count: number }>("/store/mates/my/offers", {
    query: status ? { status } : undefined,
  })

export const listReceivedMatesOffers = async () =>
  call<{ offers: MatesOffer[]; count: number }>(
    "/store/mates/my/received-offers"
  )

export const getMatesOffer = async (id: string) =>
  call<{ offer: MatesOffer }>(`/store/mates/offers/${id}`)

export const actOnMatesOffer = async (
  id: string,
  action: "accept" | "reject" | "withdraw" | "counter",
  amount?: number
) =>
  call<{ offer: MatesOffer }>(`/store/mates/offers/${id}/${action}`, {
    method: "POST",
    body: action === "counter" ? { amount } : {},
  })

export const listMatesMessages = async (offerId: string) =>
  call<{ messages: MatesMessage[] }>(`/store/mates/offers/${offerId}/messages`)

export const postMatesMessage = async (offerId: string, body: string) =>
  call<{ message: MatesMessage }>(`/store/mates/offers/${offerId}/messages`, {
    method: "POST",
    body: { body },
  })
