import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MATES_MODULE } from "../modules/mates"
import MatesModuleService from "../modules/mates/service"
import { getListing, getOwnListing, hardDeleteListing } from "./steps/mates-helpers"

// customer_id is set when the seller deletes their own listing, and left out when Admin deletes it.
export type DeleteMatesListingInput = { id: string; customer_id?: string }

// Permanent delete: the listing, every offer on it, their messages and its reports. It cannot be undone.
const deleteMatesListingStep = createStep(
  "delete-mates-listing",
  async (input: DeleteMatesListingInput, { container }) => {
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    if (input.customer_id) {
      await getOwnListing(mates, input.id, input.customer_id)
    } else {
      await getListing(mates, input.id)
    }
    await hardDeleteListing(mates, input.id)
    return new StepResponse(input.id)
  }
)

export const deleteMatesListingWorkflow = createWorkflow(
  "delete-mates-listing",
  (input: DeleteMatesListingInput) => {
    const id = deleteMatesListingStep(input)
    return new WorkflowResponse(id)
  }
)
