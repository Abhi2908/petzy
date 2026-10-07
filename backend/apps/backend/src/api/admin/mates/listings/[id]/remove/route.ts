import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MATES_MODULE } from "../../../../../../modules/mates"
import MatesModuleService from "../../../../../../modules/mates/service"
import { moderateMatesListingWorkflow } from "../../../../../../workflows/moderate-mates-listing"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  await moderateMatesListingWorkflow(req.scope).run({ input: { id: req.params.id, action: "remove" } })
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  res.json({ listing: await mates.retrieveMatesListing(req.params.id) })
}
