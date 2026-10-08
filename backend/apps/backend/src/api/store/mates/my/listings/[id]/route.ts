import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MATES_MODULE } from "../../../../../../modules/mates"
import MatesModuleService from "../../../../../../modules/mates/service"
import { ownListing, ownListingWithPhone } from "../../../../../../modules/mates/utils/serialize"
import { deleteMatesListingWorkflow } from "../../../../../../workflows/delete-mates-listing"
import { getOwnListing } from "../../../../../../workflows/steps/mates-helpers"
import { updateMatesListingWorkflow } from "../../../../../../workflows/update-mates-listing"
import { customerIdOf } from "../../../helpers"
import { UpdateMatesListingBody } from "../../../validators"

// One of the customer's own listings, with the phone they entered (the owner-only listing reads are the
// list and this route; every other listing response leaves the phone out).
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  res.json({ listing: ownListingWithPhone(await getOwnListing(mates, req.params.id, customerIdOf(req))) })
}

// Edit. The listing goes back to review, so an active listing is hidden until it is approved again.
export async function POST(req: AuthenticatedMedusaRequest<UpdateMatesListingBody>, res: MedusaResponse) {
  const customerId = customerIdOf(req)
  await updateMatesListingWorkflow(req.scope).run({
    input: { ...req.validatedBody, id: req.params.id, customer_id: customerId },
  })
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  res.json({ listing: ownListing(await getOwnListing(mates, req.params.id, customerId)) })
}

// Permanent delete, together with its offers, messages and reports.
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await deleteMatesListingWorkflow(req.scope).run({ input: { id: req.params.id, customer_id: customerIdOf(req) } })
  res.json({ id: req.params.id, object: "mates_listing", deleted: true })
}
