import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MATES_MODULE } from "../../../../modules/mates"
import MatesModuleService from "../../../../modules/mates/service"

// Query: status (comma separated), limit, offset. Admin sees full records, phone numbers included.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  const q = req.query as Record<string, string | undefined>
  const filters = q.status ? { status: q.status.split(",") } : {}
  const take = Math.min(Math.max(Number(q.limit) || 50, 1), 200)
  const skip = Math.max(Number(q.offset) || 0, 0)

  const [listings, count] = await mates.listAndCountMatesListings(filters, {
    order: { created_at: "DESC" },
    take,
    skip,
  })

  const ids = listings.map((l) => l.id)
  const openReports = ids.length ? await mates.listMatesReports({ listing_id: ids, status: "open" }) : []
  const reportsByListing = new Map<string, number>()
  for (const r of openReports) {
    const listingId = (r as unknown as { listing_id: string }).listing_id
    reportsByListing.set(listingId, (reportsByListing.get(listingId) ?? 0) + 1)
  }

  res.json({
    listings: listings.map((l) => ({ ...l, open_reports: reportsByListing.get(l.id) ?? 0 })),
    count,
    limit: take,
    offset: skip,
  })
}
