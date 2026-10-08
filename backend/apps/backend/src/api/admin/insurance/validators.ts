import { z } from "@medusajs/framework/zod"
import { LEAD_STATUSES } from "../../../modules/insurance/models/insurance-lead"
import { PET_TYPES } from "../../../modules/insurance/models/insurance-plan"

// Links are shown to customers, so only http(s) is accepted (zod's url() alone also lets "javascript:" through).
const webLink = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine((u) => /^https?:\/\//i.test(u), "Use a link starting with http:// or https://")

const status = z.enum(["active", "inactive"])
const shortList = z.array(z.string().trim().min(1).max(120)).max(10)
const rupees = z.number().int().min(0)

export const CreateInsurancePartnerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  logo_url: webLink.nullish(),
  website_url: webLink.nullish(),
  contact_email: z.string().trim().email().max(160).nullish(),
  contact_phone: z.string().trim().max(30).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  status: status.optional(),
})
export type CreateInsurancePartnerBody = z.infer<typeof CreateInsurancePartnerSchema>

export const UpdateInsurancePartnerSchema = CreateInsurancePartnerSchema.partial()
export type UpdateInsurancePartnerBody = z.infer<typeof UpdateInsurancePartnerSchema>

export const CreateInsurancePlanSchema = z.object({
  partner_id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullish(),
  pet_types: z.array(z.enum(PET_TYPES)).max(PET_TYPES.length),
  min_age_months: z.number().int().min(0).max(360),
  max_age_months: z.number().int().min(0).max(360),
  annual_premium_from: rupees.max(10_000_000),
  cover_amount: rupees.max(100_000_000),
  highlights: shortList.optional(),
  exclusions: shortList.optional(),
  status: status.optional(),
  sort_order: z.number().int().min(-10_000).max(10_000).optional(),
})
export type CreateInsurancePlanBody = z.infer<typeof CreateInsurancePlanSchema>

export const UpdateInsurancePlanSchema = CreateInsurancePlanSchema.partial()
export type UpdateInsurancePlanBody = z.infer<typeof UpdateInsurancePlanSchema>

export const UpdateInsuranceLeadSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  internal_notes: z.string().trim().max(5000).nullish(),
})
export type UpdateInsuranceLeadBody = z.infer<typeof UpdateInsuranceLeadSchema>
