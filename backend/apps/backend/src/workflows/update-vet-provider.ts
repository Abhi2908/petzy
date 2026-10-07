import { MedusaError } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { VET_MODULE } from "../modules/vet"
import VetModuleService from "../modules/vet/service"
import { WorkingHour } from "../modules/vet/utils/slots"
import { assertValidWorkingHours } from "./steps/vet-helpers"

export type UpdateVetProviderInput = {
  id: string
  name?: string
  clinic_name?: string
  city?: string
  phone?: string | null
  email?: string | null
  specialties?: string | null
  consultation_fee?: number
  slot_minutes?: number
  status?: "active" | "inactive"
  // When given, replaces all working hours of the provider.
  working_hours?: WorkingHour[]
}

const updateVetProviderStep = createStep(
  "update-vet-provider",
  async (input: UpdateVetProviderInput, { container }) => {
    const vet: VetModuleService = container.resolve(VET_MODULE)
    const { id, working_hours, ...fields } = input

    const [before] = await vet.listVetProviders({ id }, { relations: ["working_hours"] })
    if (!before) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Vet provider ${id} was not found`)
    }

    const slotMinutes = fields.slot_minutes ?? before.slot_minutes
    const finalHours: WorkingHour[] = working_hours ?? before.working_hours.map((h) => ({
      weekday: h.weekday,
      start_time: h.start_time,
      end_time: h.end_time,
    }))
    assertValidWorkingHours(finalHours, slotMinutes)

    if (Object.keys(fields).length) {
      await vet.updateVetProviders({ id, ...fields })
    }
    if (working_hours) {
      await vet.deleteVetWorkingHours({ provider_id: id })
      if (working_hours.length) {
        await vet.createVetWorkingHours(working_hours.map((h) => ({ ...h, provider_id: id })))
      }
    }

    return new StepResponse(id, {
      id,
      replacedHours: Boolean(working_hours),
      before: {
        name: before.name,
        clinic_name: before.clinic_name,
        city: before.city,
        phone: before.phone,
        email: before.email,
        specialties: before.specialties,
        consultation_fee: before.consultation_fee,
        slot_minutes: before.slot_minutes,
        status: before.status,
      },
      hours: before.working_hours.map((h) => ({ weekday: h.weekday, start_time: h.start_time, end_time: h.end_time })),
    })
  },
  async (snapshot, { container }) => {
    if (!snapshot) {
      return
    }
    const vet: VetModuleService = container.resolve(VET_MODULE)
    await vet.updateVetProviders({ id: snapshot.id, ...snapshot.before })
    if (snapshot.replacedHours) {
      await vet.deleteVetWorkingHours({ provider_id: snapshot.id })
      if (snapshot.hours.length) {
        await vet.createVetWorkingHours(snapshot.hours.map((h) => ({ ...h, provider_id: snapshot.id })))
      }
    }
  }
)

export const updateVetProviderWorkflow = createWorkflow("update-vet-provider", (input: UpdateVetProviderInput) => {
  const providerId = updateVetProviderStep(input)
  return new WorkflowResponse(providerId)
})
