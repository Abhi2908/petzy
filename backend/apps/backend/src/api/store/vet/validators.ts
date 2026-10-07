import { z } from "@medusajs/framework/zod"

export const CreateStoreVetAppointmentSchema = z.object({
  provider_id: z.string().min(1),
  starts_at: z.string().datetime({ offset: true }),
  customer_name: z.string().trim().min(1).max(120),
  customer_phone: z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/, "Enter a valid phone number"),
  customer_email: z.string().trim().email().max(160).nullish(),
  pet_name: z.string().trim().min(1).max(80),
  pet_type: z.string().trim().min(1).max(40),
  reason: z.string().trim().max(500).nullish(),
})
export type CreateStoreVetAppointmentBody = z.infer<typeof CreateStoreVetAppointmentSchema>
