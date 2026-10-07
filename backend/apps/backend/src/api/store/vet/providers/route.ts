import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VET_MODULE } from "../../../../modules/vet"
import VetModuleService from "../../../../modules/vet/service"

// Public list of vets that can be booked. Only fields that are safe to show customers.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vet: VetModuleService = req.scope.resolve(VET_MODULE)
  const providers = await vet.listVetProviders({ status: "active" }, { order: { name: "ASC" } })
  res.json({
    providers: providers.map((p) => ({
      id: p.id,
      name: p.name,
      clinic_name: p.clinic_name,
      city: p.city,
      phone: p.phone,
      specialties: p.specialties,
      consultation_fee: p.consultation_fee,
      slot_minutes: p.slot_minutes,
    })),
  })
}
