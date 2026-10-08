import { MedusaError } from "@medusajs/framework/utils"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MATES_MODULE } from "../modules/mates"
import MatesModuleService from "../modules/mates/service"
import { sideOf } from "../modules/mates/utils/rules"
import { MATES_EVENTS } from "../modules/mates/events"

export type CreateMatesMessageInput = { offer_id: string; customer_id: string; body: string }

// Only the buyer and the seller of an offer can write on it, while it is live or accepted.
const createMatesMessageStep = createStep(
  "create-mates-message",
  async (input: CreateMatesMessageInput, { container }) => {
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    const [offer] = await mates.listMatesOffers({ id: input.offer_id }, { relations: ["listing"] })
    const sender = offer ? sideOf(input.customer_id, offer, offer.listing) : null
    if (!offer || !sender) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Offer ${input.offer_id} was not found`)
    }
    if (offer.status === "rejected" || offer.status === "withdrawn") {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `This offer is ${offer.status}, so it is closed for messages.`)
    }
    const message = await mates.createMatesMessages({ offer_id: offer.id, sender, body: input.body })
    return new StepResponse(message.id, message.id)
  },
  async (id, { container }) => {
    if (!id) {
      return
    }
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    await mates.deleteMatesMessages(id)
  }
)

export const createMatesMessageWorkflow = createWorkflow(
  "create-mates-message",
  (input: CreateMatesMessageInput) => {
    const id = createMatesMessageStep(input)
    emitEventStep({
      eventName: MATES_EVENTS.MESSAGE_CREATED,
      data: transform({ id }, ({ id }) => ({ id: id })),
    })
    return new WorkflowResponse(id)
  }
)
