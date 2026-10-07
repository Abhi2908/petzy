import { MedusaError } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MATES_MODULE } from "../modules/mates"
import MatesModuleService from "../modules/mates/service"
import { assertCanMakeOffer, ListingStatus } from "../modules/mates/utils/rules"
import { isUniqueViolation } from "./steps/mates-helpers"

export type CreateMatesOfferInput = {
  listing_id: string
  buyer_customer_id: string
  buyer_phone: string
  amount: number
}

const LIVE_OFFER = "You already have an offer waiting on this listing. Change or withdraw that one instead."

// buyer_phone comes only from this request. It is stored on the offer and shown to the seller once
// they accept, never earlier.
const createMatesOfferStep = createStep(
  "create-mates-offer",
  async (input: CreateMatesOfferInput, { container }) => {
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    const [listing] = await mates.listMatesListings({ id: input.listing_id })
    // Listings that are not public look the same as missing ones.
    if (!listing || listing.status !== "active") {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Listing ${input.listing_id} was not found`)
    }
    assertCanMakeOffer({
      buyerId: input.buyer_customer_id,
      amount: input.amount,
      listing: { ...listing, status: listing.status as ListingStatus },
    })

    const live = await mates.listMatesOffers({
      listing_id: listing.id,
      buyer_customer_id: input.buyer_customer_id,
      status: ["open", "countered"],
    })
    if (live.length) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, LIVE_OFFER)
    }

    try {
      const offer = await mates.createMatesOffers({
        listing_id: listing.id,
        buyer_customer_id: input.buyer_customer_id,
        buyer_phone: input.buyer_phone,
        amount: input.amount,
        status: "open",
        last_actor: "buyer",
      })
      return new StepResponse(offer.id, offer.id)
    } catch (error) {
      // Two requests from the same buyer at the same moment: the database index lets only one in.
      if (isUniqueViolation(error)) {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, LIVE_OFFER)
      }
      throw error
    }
  },
  async (id, { container }) => {
    if (!id) {
      return
    }
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    await mates.deleteMatesOffers(id)
  }
)

export const createMatesOfferWorkflow = createWorkflow(
  "create-mates-offer",
  (input: CreateMatesOfferInput) => {
    const id = createMatesOfferStep(input)
    return new WorkflowResponse(id)
  }
)
