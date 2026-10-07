import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VET_MODULE } from "../../../../modules/vet"
import VetModuleService from "../../../../modules/vet/service"
import { createVetAppointmentWorkflow } from "../../../../workflows/create-vet-appointment"
import { CreateStoreVetAppointmentBody } from "../validators"

// Book a vet slot. Guests can book, no account needed. Payment is at the clinic.
export async function POST(req: MedusaRequest<CreateStoreVetAppointmentBody>, res: MedusaResponse) {
  const { result: id } = await createVetAppointmentWorkflow(req.scope).run({ input: req.validatedBody })
  const vet: VetModuleService = req.scope.resolve(VET_MODULE)
  const a = await vet.retrieveVetAppointment(id, { relations: ["provider"] })
  res.status(201).json({
    appointment: {
      id: a.id,
      status: a.status,
      starts_at: a.starts_at,
      ends_at: a.ends_at,
      pet_name: a.pet_name,
      pet_type: a.pet_type,
      provider: {
        id: a.provider.id,
        name: a.provider.name,
        clinic_name: a.provider.clinic_name,
        city: a.provider.city,
        phone: a.provider.phone,
        consultation_fee: a.provider.consultation_fee,
      },
      payment: "Pay at the clinic",
    },
  })
}
