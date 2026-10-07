import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MATES_MODULE } from "../../../../../../modules/mates"
import MatesModuleService from "../../../../../../modules/mates/service"
import { publicMessage } from "../../../../../../modules/mates/utils/serialize"
import { createMatesMessageWorkflow } from "../../../../../../workflows/create-mates-message"
import { customerIdOf, offerViewFor } from "../../../helpers"
import { CreateMatesMessageBody } from "../../../validators"

// The conversation on one offer, oldest first. Buyer and seller only.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await offerViewFor(req.scope, req.params.id, customerIdOf(req))
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  const messages = await mates.listMatesMessages({ offer_id: req.params.id }, { order: { created_at: "ASC" } })
  res.json({ messages: messages.map(publicMessage), count: messages.length })
}

export async function POST(req: AuthenticatedMedusaRequest<CreateMatesMessageBody>, res: MedusaResponse) {
  const { result: id } = await createMatesMessageWorkflow(req.scope).run({
    input: { offer_id: req.params.id, customer_id: customerIdOf(req), body: req.validatedBody.body },
  })
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  res.status(201).json({ message: publicMessage(await mates.retrieveMatesMessage(id)) })
}
