import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MATES_MODULE } from "../modules/mates"
import MatesModuleService from "../modules/mates/service"
import { assertValidListing } from "../modules/mates/utils/rules"

export type CreateMatesListingInput = {
  seller_customer_id: string
  title: string
  pet_type: "dog" | "cat" | "bird" | "fish" | "other"
  breed: string
  gender: "male" | "female"
  age_months: number
  color?: string | null
  vaccinated?: boolean
  dewormed?: boolean
  has_papers?: boolean
  description?: string | null
  price: number
  price_negotiable?: boolean
  city: string
  state: string
  pincode: string
  image_urls?: string[]
  seller_type?: "individual" | "breeder"
  breeder_registration_no?: string | null
  seller_phone: string
}

// New listings always wait for a moderator, whatever the request says.
const createMatesListingStep = createStep(
  "create-mates-listing",
  async (input: CreateMatesListingInput, { container }) => {
    assertValidListing(input)
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    const listing = await mates.createMatesListings({
      ...input,
      image_urls: input.image_urls ?? [],
      status: "pending_review",
    })
    return new StepResponse(listing.id, listing.id)
  },
  async (id, { container }) => {
    if (!id) {
      return
    }
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    await mates.deleteMatesListings(id)
  }
)

export const createMatesListingWorkflow = createWorkflow(
  "create-mates-listing",
  (input: CreateMatesListingInput) => {
    const id = createMatesListingStep(input)
    return new WorkflowResponse(id)
  }
)
