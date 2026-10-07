import { MedusaError } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MATES_MODULE } from "../modules/mates"
import MatesModuleService from "../modules/mates/service"
import { applyOfferAction, ListingStatus, OfferAction, OfferStatus, Side, sideOf } from "../modules/mates/utils/rules"
import { closeOffers, moveListing, moveOffer, OfferSnapshot, restoreOffers } from "./steps/mates-helpers"

export type ActOnMatesOfferInput = {
  offer_id: string
  customer_id: string
  action: OfferAction
  amount?: number
}

const CHANGED = "This offer just changed. Refresh and try again."

type Snapshot = {
  offer: { id: string; status: OfferStatus; last_actor: Side; amount: number }
  listing: { id: string; status: ListingStatus } | null
  closed: OfferSnapshot[]
}

// accept, reject, counter or withdraw one offer. The turn rules are in applyOfferAction.
// Accepting also reserves the listing and rejects every other offer still waiting on it.
const actOnMatesOfferStep = createStep(
  "act-on-mates-offer",
  async (input: ActOnMatesOfferInput, { container }) => {
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    const [offer] = await mates.listMatesOffers({ id: input.offer_id }, { relations: ["listing"] })
    const side = offer ? sideOf(input.customer_id, offer, offer.listing) : null
    if (!offer || !side) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Offer ${input.offer_id} was not found`)
    }
    const status = offer.status as OfferStatus
    const next = applyOfferAction({
      action: input.action,
      side,
      status,
      listingStatus: offer.listing.status as ListingStatus,
      amount: input.amount,
    })
    const snapshot: Snapshot = {
      offer: { id: offer.id, status, last_actor: offer.last_actor as Side, amount: offer.amount },
      listing: null,
      closed: [],
    }

    if (input.action !== "accept") {
      if (!(await moveOffer(mates, offer.id, status, next))) {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, CHANGED)
      }
      return new StepResponse(offer.id, snapshot)
    }

    // Reserve first: only one accept per listing can move it from active to reserved.
    if (!(await moveListing(mates, offer.listing.id, ["active"], { status: "reserved" }))) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This listing is not open for offers right now.")
    }
    snapshot.listing = { id: offer.listing.id, status: "active" }
    if (!(await moveOffer(mates, offer.id, status, next))) {
      await mates.updateMatesListings({ id: offer.listing.id, status: "active" })
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, CHANGED)
    }
    snapshot.closed = await closeOffers(mates, offer.listing.id, { exceptId: offer.id })
    return new StepResponse(offer.id, snapshot)
  },
  async (snapshot, { container }) => {
    if (!snapshot) {
      return
    }
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    await restoreOffers(mates, snapshot.closed)
    await mates.updateMatesOffers(snapshot.offer)
    if (snapshot.listing) {
      await mates.updateMatesListings(snapshot.listing)
    }
  }
)

export const actOnMatesOfferWorkflow = createWorkflow(
  "act-on-mates-offer",
  (input: ActOnMatesOfferInput) => {
    const id = actOnMatesOfferStep(input)
    return new WorkflowResponse(id)
  }
)
