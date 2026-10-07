import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MATES_MODULE } from "../../../../../modules/mates"
import MatesModuleService from "../../../../../modules/mates/service"
import { deleteMatesListingWorkflow } from "../../../../../workflows/delete-mates-listing"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  const listing = await mates.retrieveMatesListing(req.params.id, { relations: ["offers", "reports"] })
  res.json({ listing })
}

// Permanent delete with every offer, message and report on the listing.
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  await deleteMatesListingWorkflow(req.scope).run({ input: { id: req.params.id } })
  res.json({ id: req.params.id, object: "mates_listing", deleted: true })
}
