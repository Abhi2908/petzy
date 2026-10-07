import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MATES_MODULE } from "../../../../modules/mates"
import MatesModuleService from "../../../../modules/mates/service"

// Query: status (open | resolved), limit, offset
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  const q = req.query as Record<string, string | undefined>
  const take = Math.min(Math.max(Number(q.limit) || 50, 1), 200)
  const skip = Math.max(Number(q.offset) || 0, 0)
  const [reports, count] = await mates.listAndCountMatesReports(q.status ? { status: q.status.split(",") } : {}, {
    relations: ["listing"],
    order: { created_at: "DESC" },
    take,
    skip,
  })
  res.json({ reports, count, limit: take, offset: skip })
}
