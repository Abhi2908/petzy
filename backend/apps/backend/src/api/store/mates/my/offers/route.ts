import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MATES_MODULE } from "../../../../../modules/mates"
import MatesModuleService from "../../../../../modules/mates/service"
import { offerForSide } from "../../../../../modules/mates/utils/serialize"
import { customerIdOf } from "../../helpers"

// Offers the customer has made as a buyer. Optional query: status (comma separated).
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  const { status } = req.query as Record<string, string | undefined>
  const offers = await mates.listMatesOffers(
    { buyer_customer_id: customerIdOf(req), ...(status ? { status: status.split(",") } : {}) },
    { relations: ["listing"], order: { updated_at: "DESC" } }
  )
  res.json({ offers: offers.map((o) => offerForSide(o, o.listing, "buyer")), count: offers.length })
}
