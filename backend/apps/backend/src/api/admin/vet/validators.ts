import { z } from "@medusajs/framework/zod"

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM, for example 09:00")

export const WorkingHourSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start_time: time,
  end_time: time,
})

export const CreateVetProviderSchema = z.object({
  name: z.string().trim().min(1).max(120),
  clinic_name: z.string().trim().min(1).max(160),
  city: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(30).nullish(),
  email: z.string().trim().email().max(160).nullish(),
  specialties: z.string().trim().max(200).nullish(),
  consultation_fee: z.number().int().min(0).max(100000).optional(),
  slot_minutes: z.number().int().min(10).max(240).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  working_hours: z.array(WorkingHourSchema).max(42).optional(),
})
export type CreateVetProviderBody = z.infer<typeof CreateVetProviderSchema>

export const UpdateVetProviderSchema = CreateVetProviderSchema.partial()
export type UpdateVetProviderBody = z.infer<typeof UpdateVetProviderSchema>

export const UpdateVetAppointmentSchema = z.object({
  status: z.enum(["booked", "confirmed", "completed", "cancelled", "no_show"]).optional(),
  notes: z.string().trim().max(1000).nullish(),
})
export type UpdateVetAppointmentBody = z.infer<typeof UpdateVetAppointmentSchema>
