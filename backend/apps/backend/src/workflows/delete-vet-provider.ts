import { MedusaError } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { VET_MODULE } from "../modules/vet"
import VetModuleService from "../modules/vet/service"

// Permanent delete: removes the provider, its working hours and all of its appointment history.
// Refuses while there are upcoming appointments that are still live, so nobody turns up to a closed clinic.
const deleteVetProviderStep = createStep("delete-vet-provider", async (id: string, { container }) => {
  const vet: VetModuleService = container.resolve(VET_MODULE)

  const [provider] = await vet.listVetProviders({ id })
  if (!provider) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Vet provider ${id} was not found`)
  }

  const upcoming = await vet.listVetAppointments({
    provider_id: id,
    status: ["booked", "confirmed"],
    starts_at: { $gt: new Date() },
  })
  if (upcoming.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `This provider has ${upcoming.length} upcoming appointment(s). Cancel them first, or set the provider to inactive.`
    )
  }

  await vet.deleteVetAppointments({ provider_id: id })
  await vet.deleteVetWorkingHours({ provider_id: id })
  await vet.deleteVetProviders(id)
  return new StepResponse(id)
})

export const deleteVetProviderWorkflow = createWorkflow("delete-vet-provider", (id: string) => {
  const deletedId = deleteVetProviderStep(id)
  return new WorkflowResponse(deletedId)
})
