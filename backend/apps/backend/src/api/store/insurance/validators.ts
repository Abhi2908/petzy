import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { PET_TYPES } from "../../../modules/insurance/models/insurance-plan"

// Shapes only. Whether the pet fits the plan, and the daily limit, are checked in the workflow.
export const CreateInsuranceLeadSchema = z.object({
  plan_id: z.string().min(1),
  customer_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/, "Enter a valid phone number"),
  email: z.string().trim().email().max(160).nullish(),
  pet_name: z.string().trim().max(80).nullish(),
  pet_type: z.enum(PET_TYPES),
  breed: z.string().trim().max(80).nullish(),
  pet_age_months: z.number().int().min(0).max(360),
  city: z.string().trim().max(80).nullish(),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a 6 digit PIN code").nullish(),
  message: z.string().trim().max(1000).nullish(),
})
export type CreateInsuranceLeadBody = z.infer<typeof CreateInsuranceLeadSchema>

const PlansQuerySchema = z.object({
  pet_type: z.enum(PET_TYPES).optional(),
  pet_age_months: z.coerce.number().int().min(0).max(360).optional(),
  max_premium: z.coerce.number().int().min(0).optional(),
})
export type PlansQuery = z.infer<typeof PlansQuerySchema>

export function parsePlansQuery(query: unknown): PlansQuery {
  const parsed = PlansQuerySchema.safeParse(query)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `${issue.path.join(".")}: ${issue.message}`)
  }
  return parsed.data
}
