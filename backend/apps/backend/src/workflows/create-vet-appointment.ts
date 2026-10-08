import { MedusaError } from "@medusajs/framework/utils"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { VET_MODULE } from "../modules/vet"
import VetModuleService from "../modules/vet/service"
import { clinicDateOf, generateSlots } from "../modules/vet/utils/slots"
import { isUniqueViolation } from "./steps/vet-helpers"
import { VET_EVENTS } from "../modules/vet/events"

export type CreateVetAppointmentInput = {
  provider_id: string
  starts_at: string
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  pet_name: string
  pet_type: string
  reason?: string | null
}

const DAY_MS = 86_400_000

const createVetAppointmentStep = createStep(
  "create-vet-appointment",
  async (input: CreateVetAppointmentInput, { container }) => {
    const vet: VetModuleService = container.resolve(VET_MODULE)

    const startsAt = new Date(input.starts_at)
    if (Number.isNaN(startsAt.getTime())) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "starts_at must be a valid date and time")
    }

    const [provider] = await vet.listVetProviders({ id: input.provider_id }, { relations: ["working_hours"] })
    if (!provider || provider.status !== "active") {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "This vet provider is not available for booking")
    }

    // The requested time must be one of the slots the provider really offers right now.
    const existing = await vet.listVetAppointments({
      provider_id: provider.id,
      starts_at: { $gte: new Date(startsAt.getTime() - DAY_MS), $lt: new Date(startsAt.getTime() + DAY_MS) },
    })
    const slots = generateSlots({
      date: clinicDateOf(startsAt),
      slotMinutes: provider.slot_minutes,
      hours: provider.working_hours,
      booked: existing.filter((a) => a.status !== "cancelled"),
      now: new Date(),
    })
    const slot = slots.find((s) => s.starts_at === startsAt.toISOString())
    if (!slot) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "That time is no longer available. Please pick another slot.")
    }

    try {
      const appointment = await vet.createVetAppointments({
        provider_id: provider.id,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        customer_email: input.customer_email ?? null,
        pet_name: input.pet_name,
        pet_type: input.pet_type,
        reason: input.reason ?? null,
        starts_at: new Date(slot.starts_at),
        ends_at: new Date(slot.ends_at),
      })
      return new StepResponse(appointment.id, appointment.id)
    } catch (error) {
      // Two customers pressed "book" for the same slot at the same moment: the database index lets only one win.
      if (isUniqueViolation(error)) {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "That time was just booked by someone else. Please pick another slot.")
      }
      throw error
    }
  },
  async (appointmentId, { container }) => {
    if (!appointmentId) {
      return
    }
    const vet: VetModuleService = container.resolve(VET_MODULE)
    await vet.deleteVetAppointments(appointmentId)
  }
)

export const createVetAppointmentWorkflow = createWorkflow(
  "create-vet-appointment",
  (input: CreateVetAppointmentInput) => {
    const appointmentId = createVetAppointmentStep(input)
    emitEventStep({
      eventName: VET_EVENTS.APPOINTMENT_BOOKED,
      data: transform({ appointmentId }, ({ appointmentId }) => ({ id: appointmentId })),
    })
    return new WorkflowResponse(appointmentId)
  }
)
