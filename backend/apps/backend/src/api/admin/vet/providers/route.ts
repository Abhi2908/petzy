import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VET_MODULE } from "../../../../modules/vet"
import VetModuleService from "../../../../modules/vet/service"
import { createVetProviderWorkflow } from "../../../../workflows/create-vet-provider"
import { CreateVetProviderBody } from "../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vet: VetModuleService = req.scope.resolve(VET_MODULE)
  const providers = await vet.listVetProviders({}, { relations: ["working_hours"], order: { name: "ASC" } })

  const upcoming = await vet.listVetAppointments({
    status: ["booked", "confirmed"],
    starts_at: { $gt: new Date() },
  })
  const countByProvider = new Map<string, number>()
  for (const a of upcoming) {
    const providerId = (a as unknown as { provider_id: string }).provider_id
    countByProvider.set(providerId, (countByProvider.get(providerId) ?? 0) + 1)
  }

  res.json({
    providers: providers.map((p) => ({ ...p, upcoming_appointments: countByProvider.get(p.id) ?? 0 })),
    count: providers.length,
  })
}

export async function POST(req: MedusaRequest<CreateVetProviderBody>, res: MedusaResponse) {
  const { result: id } = await createVetProviderWorkflow(req.scope).run({ input: req.validatedBody })
  const vet: VetModuleService = req.scope.resolve(VET_MODULE)
  const provider = await vet.retrieveVetProvider(id, { relations: ["working_hours"] })
  res.status(201).json({ provider })
}
