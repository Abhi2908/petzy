import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VET_MODULE } from "../../../../../modules/vet"
import VetModuleService from "../../../../../modules/vet/service"
import { updateVetAppointmentWorkflow } from "../../../../../workflows/update-vet-appointment"
import { UpdateVetAppointmentBody } from "../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vet: VetModuleService = req.scope.resolve(VET_MODULE)
  const appointment = await vet.retrieveVetAppointment(req.params.id, { relations: ["provider"] })
  res.json({ appointment })
}

export async function POST(req: MedusaRequest<UpdateVetAppointmentBody>, res: MedusaResponse) {
  await updateVetAppointmentWorkflow(req.scope).run({ input: { id: req.params.id, ...req.validatedBody } })
  const vet: VetModuleService = req.scope.resolve(VET_MODULE)
  const appointment = await vet.retrieveVetAppointment(req.params.id, { relations: ["provider"] })
  res.json({ appointment })
}
