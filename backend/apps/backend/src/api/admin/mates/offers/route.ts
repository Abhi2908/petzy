import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MATES_MODULE } from "../../../../modules/mates"
import MatesModuleService from "../../../../modules/mates/service"

// Read-only. Query: status (comma separated), listing_id, limit, offset
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  const q = req.query as Record<string, string | undefined>
  const filters: Record<string, unknown> = {}
  if (q.status) {
    filters.status = q.status.split(",")
  }
  if (q.listing_id) {
    filters.listing_id = q.listing_id
  }
  const take = Math.min(Math.max(Number(q.limit) || 50, 1), 200)
  const skip = Math.max(Number(q.offset) || 0, 0)
  const [offers, count] = await mates.listAndCountMatesOffers(filters, {
    relations: ["listing"],
    order: { updated_at: "DESC" },
    take,
    skip,
  })
  res.json({ offers, count, limit: take, offset: skip })
}
