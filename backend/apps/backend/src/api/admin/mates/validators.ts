import { z } from "@medusajs/framework/zod"
import { REPORT_STATUSES } from "../../../modules/mates/models/mates-report"

export const RejectMatesListingSchema = z.object({ reason: z.string().trim().min(1).max(500) })
export type RejectMatesListingBody = z.infer<typeof RejectMatesListingSchema>

export const UpdateMatesReportSchema = z.object({ status: z.enum(REPORT_STATUSES) })
export type UpdateMatesReportBody = z.infer<typeof UpdateMatesReportSchema>
