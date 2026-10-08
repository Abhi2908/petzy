import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MATES_MODULE } from "../../../../../modules/mates"
import MatesModuleService from "../../../../../modules/mates/service"
import { ownListingWithPhone } from "../../../../../modules/mates/utils/serialize"
import { customerIdOf } from "../../helpers"

// Every listing the customer has posted, in any status, newest first. This is the only listing response
// that includes seller_phone, and it only ever returns the caller's own listings.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  const listings = await mates.listMatesListings(
    { seller_customer_id: customerIdOf(req) },
    { order: { created_at: "DESC" } }
  )
  res.json({ listings: listings.map(ownListingWithPhone), count: listings.length })
}
