import { MedusaError } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MATES_MODULE } from "../modules/mates"
import MatesModuleService from "../modules/mates/service"
import { ListingStatus } from "../modules/mates/utils/rules"
import { closeOffers, getOwnListing, moveListing, OfferSnapshot, restoreOffers } from "./steps/mates-helpers"

export type MarkMatesListingSoldInput = { id: string; customer_id: string }

// The seller marks an active or reserved listing as sold. Offers still waiting are rejected.
// An accepted offer stays accepted, so both sides keep each other's phone number.
const markMatesListingSoldStep = createStep(
  "mark-mates-listing-sold",
  async (input: MarkMatesListingSoldInput, { container }) => {
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    const before = await getOwnListing(mates, input.id, input.customer_id)
    if (!(await moveListing(mates, input.id, ["active", "reserved"], { status: "sold" }))) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `A ${before.status} listing cannot be marked as sold.`)
    }
    const closed = await closeOffers(mates, input.id)
    return new StepResponse(input.id, { id: input.id, status: before.status as ListingStatus, closed })
  },
  async (snapshot, { container }) => {
    if (!snapshot) {
      return
    }
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    await restoreOffers(mates, snapshot.closed as OfferSnapshot[])
    await mates.updateMatesListings({ id: snapshot.id, status: snapshot.status })
  }
)

export const markMatesListingSoldWorkflow = createWorkflow(
  "mark-mates-listing-sold",
  (input: MarkMatesListingSoldInput) => {
    const id = markMatesListingSoldStep(input)
    return new WorkflowResponse(id)
  }
)
