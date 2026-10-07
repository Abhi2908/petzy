import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { GENDERS, PET_TYPES, SELLER_TYPES } from "../../../modules/mates/models/mates-listing"

// Shapes only. Business rules (amount above 0, photo limit, breeder number for dogs, ...) live in the
// workflows and answer with NOT_ALLOWED.
const phone = z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/, "Enter a valid phone number")
const rupees = z.number().int().max(10_000_000)

export const CreateMatesListingSchema = z.object({
  title: z.string().trim().min(3).max(120),
  pet_type: z.enum(PET_TYPES),
  breed: z.string().trim().min(1).max(80),
  gender: z.enum(GENDERS),
  age_months: z.number().int().min(0).max(360),
  color: z.string().trim().max(60).nullish(),
  vaccinated: z.boolean().optional(),
  dewormed: z.boolean().optional(),
  has_papers: z.boolean().optional(),
  description: z.string().trim().max(5000).nullish(),
  price: rupees.min(0),
  price_negotiable: z.boolean().optional(),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a 6 digit PIN code"),
  image_urls: z.array(z.string().trim().url().max(1000)).optional(),
  seller_type: z.enum(SELLER_TYPES).optional(),
  breeder_registration_no: z.string().trim().max(80).nullish(),
  seller_phone: phone,
})
export type CreateMatesListingBody = z.infer<typeof CreateMatesListingSchema>

export const UpdateMatesListingSchema = CreateMatesListingSchema.partial()
export type UpdateMatesListingBody = z.infer<typeof UpdateMatesListingSchema>

export const CreateMatesOfferSchema = z.object({
  amount: rupees,
  buyer_phone: phone,
})
export type CreateMatesOfferBody = z.infer<typeof CreateMatesOfferSchema>

export const CounterMatesOfferSchema = z.object({ amount: rupees })
export type CounterMatesOfferBody = z.infer<typeof CounterMatesOfferSchema>

export const CreateMatesMessageSchema = z.object({ body: z.string().trim().min(1).max(1000) })
export type CreateMatesMessageBody = z.infer<typeof CreateMatesMessageSchema>

export const CreateMatesReportSchema = z.object({ reason: z.string().trim().min(3).max(500) })
export type CreateMatesReportBody = z.infer<typeof CreateMatesReportSchema>

const PublicListingsQuerySchema = z.object({
  pet_type: z.enum(PET_TYPES).optional(),
  breed: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  gender: z.enum(GENDERS).optional(),
  min_price: z.coerce.number().int().min(0).optional(),
  max_price: z.coerce.number().int().min(0).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})
export type PublicListingsQuery = z.infer<typeof PublicListingsQuerySchema>

export function parsePublicListingsQuery(query: unknown): PublicListingsQuery {
  const parsed = PublicListingsQuerySchema.safeParse(query)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `${issue.path.join(".")}: ${issue.message}`)
  }
  return parsed.data
}
