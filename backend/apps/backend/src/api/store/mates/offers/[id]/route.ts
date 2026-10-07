import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { customerIdOf, offerViewFor } from "../../helpers"

// One offer, for its buyer or seller. Once accepted it includes the other side's phone number.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json({ offer: await offerViewFor(req.scope, req.params.id, customerIdOf(req)) })
}
