import { MedusaError } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MATES_MODULE } from "../modules/mates"
import MatesModuleService from "../modules/mates/service"
import { getOwnListing, moveListing } from "./steps/mates-helpers"

export type ReleaseMatesReservationInput = { id: string; customer_id: string }

// The deal fell through: the seller puts a reserved listing back on sale. The accepted offer becomes
// withdrawn, which also stops showing the two phone numbers to each other.
const releaseMatesReservationStep = createStep(
  "release-mates-reservation",
  async (input: ReleaseMatesReservationInput, { container }) => {
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    const listing = await getOwnListing(mates, input.id, input.customer_id)
    if (listing.status !== "reserved") {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Only a reserved listing can be released.")
    }
    const [accepted] = await mates.listMatesOffers({ listing_id: input.id, status: "accepted" })

    if (!(await moveListing(mates, input.id, ["reserved"], { status: "active" }))) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This listing just changed. Refresh and try again.")
    }
    if (accepted) {
      await mates.updateMatesOffers({ id: accepted.id, status: "withdrawn", last_actor: "seller" })
    }
    return new StepResponse(input.id, { listingId: input.id, offerId: accepted?.id ?? null })
  },
  async (snapshot, { container }) => {
    if (!snapshot) {
      return
    }
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    if (snapshot.offerId) {
      await mates.updateMatesOffers({ id: snapshot.offerId, status: "accepted" })
    }
    await mates.updateMatesListings({ id: snapshot.listingId, status: "reserved" })
  }
)

export const releaseMatesReservationWorkflow = createWorkflow(
  "release-mates-reservation",
  (input: ReleaseMatesReservationInput) => {
    const id = releaseMatesReservationStep(input)
    return new WorkflowResponse(id)
  }
)
