import { MedusaError } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MATES_MODULE } from "../modules/mates"
import MatesModuleService from "../modules/mates/service"

export type CreateMatesReportInput = { listing_id: string; reporter_customer_id: string; reason: string }

// Listings a customer can come across: public ones, and ones reserved or sold to someone.
const REPORTABLE = ["active", "reserved", "sold"]

const createMatesReportStep = createStep(
  "create-mates-report",
  async (input: CreateMatesReportInput, { container }) => {
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    const [listing] = await mates.listMatesListings({ id: input.listing_id })
    if (!listing || !REPORTABLE.includes(listing.status)) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Listing ${input.listing_id} was not found`)
    }
    if (listing.seller_customer_id === input.reporter_customer_id) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "You cannot report your own listing.")
    }
    const open = await mates.listMatesReports({
      listing_id: listing.id,
      reporter_customer_id: input.reporter_customer_id,
      status: "open",
    })
    if (open.length) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "You have already reported this listing. Our team is looking at it.")
    }
    const report = await mates.createMatesReports({ ...input, status: "open" })
    return new StepResponse(report.id, report.id)
  },
  async (id, { container }) => {
    if (!id) {
      return
    }
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    await mates.deleteMatesReports(id)
  }
)

export const createMatesReportWorkflow = createWorkflow(
  "create-mates-report",
  (input: CreateMatesReportInput) => {
    const id = createMatesReportStep(input)
    return new WorkflowResponse(id)
  }
)
