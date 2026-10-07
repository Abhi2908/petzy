import { MedusaError } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MATES_MODULE } from "../modules/mates"
import MatesModuleService from "../modules/mates/service"
import { assertValidListing, ListingStatus, statusAfterEdit } from "../modules/mates/utils/rules"
import { CreateMatesListingInput } from "./create-mates-listing"
import { getOwnListing, moveListing } from "./steps/mates-helpers"

export type UpdateMatesListingInput = { id: string; customer_id: string } & Partial<
  Omit<CreateMatesListingInput, "seller_customer_id">
>

// The owner edits a listing. Any edit sends it back to review (an active listing stops showing until
// a moderator approves it again). Live offers stay open but are frozen until then.
const updateMatesListingStep = createStep(
  "update-mates-listing",
  async (input: UpdateMatesListingInput, { container }) => {
    const { id, customer_id, ...changes } = input
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    const before = await getOwnListing(mates, id, customer_id)

    assertValidListing({ ...before, ...changes })
    const status = statusAfterEdit(before.status as ListingStatus)

    const moved = await moveListing(mates, id, [before.status as ListingStatus], {
      ...changes,
      status,
      rejection_reason: null,
    })
    if (!moved) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This listing just changed. Refresh and try again.")
    }

    const snapshot: Record<string, unknown> = { id, status: before.status, rejection_reason: before.rejection_reason }
    for (const key of Object.keys(changes)) {
      snapshot[key] = (before as Record<string, unknown>)[key]
    }
    return new StepResponse(id, snapshot)
  },
  async (snapshot, { container }) => {
    if (!snapshot) {
      return
    }
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    await mates.updateMatesListings(snapshot as { id: string })
  }
)

export const updateMatesListingWorkflow = createWorkflow(
  "update-mates-listing",
  (input: UpdateMatesListingInput) => {
    const id = updateMatesListingStep(input)
    return new WorkflowResponse(id)
  }
)
