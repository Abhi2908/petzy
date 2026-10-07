import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { actOnMatesOfferWorkflow } from "../../../../../../workflows/act-on-mates-offer"
import { customerIdOf, offerViewFor } from "../../../helpers"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = customerIdOf(req)
  await actOnMatesOfferWorkflow(req.scope).run({
    input: { offer_id: req.params.id, customer_id: customerId, action: "reject" },
  })
  res.json({ offer: await offerViewFor(req.scope, req.params.id, customerId) })
}
