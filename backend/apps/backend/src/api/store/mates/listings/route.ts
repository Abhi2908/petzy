import { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MATES_MODULE } from "../../../../modules/mates"
import MatesModuleService from "../../../../modules/mates/service"
import { ownListing, publicListing } from "../../../../modules/mates/utils/serialize"
import { createMatesListingWorkflow } from "../../../../workflows/create-mates-listing"
import { customerIdOf } from "../helpers"
import { CreateMatesListingBody, parsePublicListingsQuery } from "../validators"

const SORTS = {
  newest: { created_at: "DESC" },
  price_asc: { price: "ASC", created_at: "DESC" },
  price_desc: { price: "DESC", created_at: "DESC" },
} as const

// Public browse. Only active listings that have not passed their expiry date.
// Query: pet_type, breed, city, gender, min_price, max_price, sort (newest | price_asc | price_desc), limit, offset
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = parsePublicListingsQuery(req.query)
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)

  const filters: Record<string, unknown> = { status: "active", expires_at: { $gt: new Date() } }
  if (q.pet_type) {
    filters.pet_type = q.pet_type
  }
  if (q.gender) {
    filters.gender = q.gender
  }
  if (q.breed) {
    filters.breed = { $ilike: `%${q.breed}%` }
  }
  if (q.city) {
    filters.city = { $ilike: q.city }
  }
  if (q.min_price !== undefined || q.max_price !== undefined) {
    filters.price = {
      ...(q.min_price !== undefined ? { $gte: q.min_price } : {}),
      ...(q.max_price !== undefined ? { $lte: q.max_price } : {}),
    }
  }

  const [listings, count] = await mates.listAndCountMatesListings(filters, {
    order: SORTS[q.sort],
    take: q.limit,
    skip: q.offset,
  })
  res.json({ listings: listings.map(publicListing), count, limit: q.limit, offset: q.offset })
}

// Post a new listing. It waits for review before anyone else can see it.
export async function POST(req: AuthenticatedMedusaRequest<CreateMatesListingBody>, res: MedusaResponse) {
  const { result: id } = await createMatesListingWorkflow(req.scope).run({
    input: { ...req.validatedBody, seller_customer_id: customerIdOf(req) },
  })
  const mates: MatesModuleService = req.scope.resolve(MATES_MODULE)
  res.status(201).json({ listing: ownListing(await mates.retrieveMatesListing(id)) })
}
