import { MedusaError } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MATES_MODULE } from "../modules/mates"
import MatesModuleService from "../modules/mates/service"
import { expiresAtFrom, ListingStatus } from "../modules/mates/utils/rules"
import { closeOffers, getListing, moveListing, OfferSnapshot, restoreOffers } from "./steps/mates-helpers"

export type ModerateMatesListingInput =
  | { id: string; action: "approve" }
  | { id: string; action: "reject"; reason: string }
  | { id: string; action: "remove" }

const notAllowed = (message: string) => new MedusaError(MedusaError.Types.NOT_ALLOWED, message)

// Admin moderation.
//   approve: pending_review -> active, visible for 60 days from now
//   reject:  pending_review -> rejected, with a reason the seller can read and fix
//   remove:  any status -> removed, and every offer on it is closed (an accepted one is withdrawn,
//            so the phone numbers stop being shown)
const moderateMatesListingStep = createStep(
  "moderate-mates-listing",
  async (input: ModerateMatesListingInput, { container }) => {
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    const before = await getListing(mates, input.id)
    const snapshot = {
      id: before.id,
      status: before.status as ListingStatus,
      rejection_reason: before.rejection_reason,
      expires_at: before.expires_at,
      closed: [] as OfferSnapshot[],
    }

    if (input.action === "approve") {
      const moved = await moveListing(mates, input.id, ["pending_review"], {
        status: "active",
        rejection_reason: null,
        expires_at: expiresAtFrom(new Date()),
      })
      if (!moved) {
        throw notAllowed(`Only a listing waiting for review can be approved (this one is ${before.status}).`)
      }
    } else if (input.action === "reject") {
      const moved = await moveListing(mates, input.id, ["pending_review"], {
        status: "rejected",
        rejection_reason: input.reason,
      })
      if (!moved) {
        throw notAllowed(`Only a listing waiting for review can be rejected (this one is ${before.status}).`)
      }
    } else {
      const others: ListingStatus[] = ["pending_review", "active", "rejected", "reserved", "sold", "expired"]
      if (!(await moveListing(mates, input.id, others, { status: "removed" }))) {
        throw notAllowed("This listing is already removed.")
      }
      snapshot.closed = await closeOffers(mates, input.id, { includeAccepted: true })
    }
    return new StepResponse(input.id, snapshot)
  },
  async (snapshot, { container }) => {
    if (!snapshot) {
      return
    }
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    await restoreOffers(mates, snapshot.closed)
    await mates.updateMatesListings({
      id: snapshot.id,
      status: snapshot.status,
      rejection_reason: snapshot.rejection_reason,
      expires_at: snapshot.expires_at,
    })
  }
)

export const moderateMatesListingWorkflow = createWorkflow(
  "moderate-mates-listing",
  (input: ModerateMatesListingInput) => {
    const id = moderateMatesListingStep(input)
    return new WorkflowResponse(id)
  }
)
