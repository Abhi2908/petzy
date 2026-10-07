import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MATES_MODULE } from "../modules/mates"
import MatesModuleService from "../modules/mates/service"
import { closeOffers, moveListing } from "./steps/mates-helpers"

export type ExpireMatesListingsInput = { now?: string }

// Active listings past expires_at become expired. Offers still waiting on them are rejected.
const expireMatesListingsStep = createStep(
  "expire-mates-listings",
  async (input: ExpireMatesListingsInput, { container }) => {
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    const now = input.now ? new Date(input.now) : new Date()
    const due = await mates.listMatesListings({ status: "active", expires_at: { $lte: now } }, { select: ["id"] })

    const expired: string[] = []
    for (const { id } of due) {
      if (await moveListing(mates, id, ["active"], { status: "expired" })) {
        await closeOffers(mates, id)
        expired.push(id)
      }
    }
    return new StepResponse(expired)
  }
)

export const expireMatesListingsWorkflow = createWorkflow(
  "expire-mates-listings",
  (input: ExpireMatesListingsInput) => {
    const expired = expireMatesListingsStep(input)
    return new WorkflowResponse(expired)
  }
)
