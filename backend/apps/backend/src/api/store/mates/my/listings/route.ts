import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MATES_MODULE } from "../../../../../modules/mates"
import MatesModuleService from "../../../../../modules/mates/service"
import { ownListing } from "../../../../../modules/mates/utils/serialize"
import { customerIdOf } from "../../helpers"

// Every listing the customer has posted, in any status, newest first.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  const listings = await mates.listMatesListings(
    { seller_customer_id: customerIdOf(req) },
    { order: { created_at: "DESC" } }
  )
  res.json({ listings: listings.map(ownListing), count: listings.length })
}
