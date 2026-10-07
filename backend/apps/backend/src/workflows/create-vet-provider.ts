import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { VET_MODULE } from "../modules/vet"
import VetModuleService from "../modules/vet/service"
import { WorkingHour } from "../modules/vet/utils/slots"
import { assertValidWorkingHours } from "./steps/vet-helpers"

export type CreateVetProviderInput = {
  name: string
  clinic_name: string
  city: string
  phone?: string | null
  email?: string | null
  specialties?: string | null
  consultation_fee?: number
  slot_minutes?: number
  status?: "active" | "inactive"
  working_hours?: WorkingHour[]
}

const createVetProviderStep = createStep(
  "create-vet-provider",
  async (input: CreateVetProviderInput, { container }) => {
    const vet: VetModuleService = container.resolve(VET_MODULE)
    const { working_hours = [], ...fields } = input
    assertValidWorkingHours(working_hours, fields.slot_minutes ?? 30)

    const provider = await vet.createVetProviders(fields)
    if (working_hours.length) {
      await vet.createVetWorkingHours(working_hours.map((h) => ({ ...h, provider_id: provider.id })))
    }
    return new StepResponse(provider.id, provider.id)
  },
  async (providerId, { container }) => {
    if (!providerId) {
      return
    }
    const vet: VetModuleService = container.resolve(VET_MODULE)
    await vet.deleteVetWorkingHours({ provider_id: providerId })
    await vet.deleteVetProviders(providerId)
  }
)

export const createVetProviderWorkflow = createWorkflow("create-vet-provider", (input: CreateVetProviderInput) => {
  const providerId = createVetProviderStep(input)
  return new WorkflowResponse(providerId)
})
