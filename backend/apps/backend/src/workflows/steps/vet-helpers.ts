import { MedusaError } from "@medusajs/framework/utils"
import { validateWorkingHour, WorkingHour } from "../../modules/vet/utils/slots"

export function assertValidWorkingHours(hours: WorkingHour[], slotMinutes: number) {
  for (const hour of hours) {
    const problem = validateWorkingHour(hour, slotMinutes)
    if (problem) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Working hours: ${problem}`)
    }
  }
}

/** Postgres reports a broken unique index as code 23505. */
export function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | undefined
  return e?.code === "23505" || /unique|duplicate key/i.test(e?.message ?? "")
}
