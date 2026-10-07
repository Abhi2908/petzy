import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MATES_MODULE } from "../../../../../modules/mates"
import MatesModuleService from "../../../../../modules/mates/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  const offer = await mates.retrieveMatesOffer(req.params.id, { relations: ["listing", "messages"] })
  res.json({ offer })
}
