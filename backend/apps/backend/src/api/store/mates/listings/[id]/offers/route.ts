import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createMatesOfferWorkflow } from "../../../../../../workflows/create-mates-offer"
import { customerIdOf, offerViewFor } from "../../../helpers"
import { CreateMatesOfferBody } from "../../../validators"

// Make an offer. buyer_phone is required and stays hidden from the seller until they accept.
export async function POST(req: AuthenticatedMedusaRequest<CreateMatesOfferBody>, res: MedusaResponse) {
  const customerId = customerIdOf(req)
  const { result: id } = await createMatesOfferWorkflow(req.scope).run({
    input: { ...req.validatedBody, listing_id: req.params.id, buyer_customer_id: customerId },
  })
  res.status(201).json({ offer: await offerViewFor(req.scope, id, customerId) })
}
