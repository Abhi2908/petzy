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
import { isUniqueViolation } from "./steps/vet-helpers"
import { VET_EVENTS } from "../modules/vet/events"

export type UpdateVetAppointmentInput = {
  id: string
  status?: "booked" | "confirmed" | "completed" | "cancelled" | "no_show"
  notes?: string | null
}

const updateVetAppointmentStep = createStep(
  "update-vet-appointment",
  async (input: UpdateVetAppointmentInput, { container }) => {
    const vet: VetModuleService = container.resolve(VET_MODULE)
    const [before] = await vet.listVetAppointments({ id: input.id })
    if (!before) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Appointment ${input.id} was not found`)
    }
    try {
      await vet.updateVetAppointments(input)
    } catch (error) {
      // Re-opening a cancelled appointment whose slot has since been rebooked.
      if (isUniqueViolation(error)) {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "That slot has been booked by someone else in the meantime.")
      }
      throw error
    }
    return new StepResponse(
      { id: input.id, previous_status: before.status },
      { id: before.id, status: before.status, notes: before.notes }
    )
  },
  async (snapshot, { container }) => {
    if (!snapshot) {
      return
    }
    const vet: VetModuleService = container.resolve(VET_MODULE)
    await vet.updateVetAppointments(snapshot)
  }
)

export const updateVetAppointmentWorkflow = createWorkflow(
  "update-vet-appointment",
  (input: UpdateVetAppointmentInput) => {
    const updated = updateVetAppointmentStep(input)
    emitEventStep({ eventName: VET_EVENTS.APPOINTMENT_UPDATED, data: updated })
    const appointmentId = transform({ updated }, ({ updated }) => updated.id)
    return new WorkflowResponse(appointmentId)
  }
)
