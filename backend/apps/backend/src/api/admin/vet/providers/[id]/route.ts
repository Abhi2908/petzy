import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VET_MODULE } from "../../../../../modules/vet"
import VetModuleService from "../../../../../modules/vet/service"
import { deleteVetProviderWorkflow } from "../../../../../workflows/delete-vet-provider"
import { updateVetProviderWorkflow } from "../../../../../workflows/update-vet-provider"
import { UpdateVetProviderBody } from "../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vet: VetModuleService = req.scope.resolve(VET_MODULE)
  const provider = await vet.retrieveVetProvider(req.params.id, { relations: ["working_hours"] })
  res.json({ provider })
}

export async function POST(req: MedusaRequest<UpdateVetProviderBody>, res: MedusaResponse) {
  await updateVetProviderWorkflow(req.scope).run({ input: { id: req.params.id, ...req.validatedBody } })
  const vet: VetModuleService = req.scope.resolve(VET_MODULE)
  const provider = await vet.retrieveVetProvider(req.params.id, { relations: ["working_hours"] })
  res.json({ provider })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  await deleteVetProviderWorkflow(req.scope).run({ input: req.params.id })
  res.json({ id: req.params.id, object: "vet_provider", deleted: true })
}
