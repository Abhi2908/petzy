import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MATES_MODULE } from "../../../../../modules/mates"
import MatesModuleService from "../../../../../modules/mates/service"
import { offerForSide } from "../../../../../modules/mates/utils/serialize"
import { customerIdOf } from "../../helpers"

// Offers buyers have made on the customer's listings. Optional query: listing_id, status (comma separated).
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  const { listing_id, status } = req.query as Record<string, string | undefined>

  const mine = await mates.listMatesListings(
    { seller_customer_id: customerIdOf(req), ...(listing_id ? { id: listing_id } : {}) },
    { select: ["id"] }
  )
  if (!mine.length) {
    return res.json({ offers: [], count: 0 })
  }
  const offers = await mates.listMatesOffers(
    { listing_id: mine.map((l) => l.id), ...(status ? { status: status.split(",") } : {}) },
    { relations: ["listing"], order: { updated_at: "DESC" } }
  )
  res.json({ offers: offers.map((o) => offerForSide(o, o.listing, "seller")), count: offers.length })
}
