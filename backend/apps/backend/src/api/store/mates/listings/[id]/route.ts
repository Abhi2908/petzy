import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MATES_MODULE } from "../../../../../modules/mates"
import MatesModuleService from "../../../../../modules/mates/service"
import { publicListing } from "../../../../../modules/mates/utils/serialize"

// Public detail. Anything that is not active (or has passed its expiry date) looks like it does not exist.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  const [listing] = await mates.listMatesListings({
    id: req.params.id,
    status: "active",
    expires_at: { $gt: new Date() },
  })
  if (!listing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Listing ${req.params.id} was not found`)
  }
  res.json({ listing: publicListing(listing) })
}
