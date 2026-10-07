import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { VET_MODULE } from "../../../../modules/vet"
import VetModuleService from "../../../../modules/vet/service"
import { CLINIC_UTC_OFFSET_MINUTES, isValidDate } from "../../../../modules/vet/utils/slots"

const dayStartUtc = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) - CLINIC_UTC_OFFSET_MINUTES * 60_000)

// Query: provider_id, status (comma separated), from / to (YYYY-MM-DD clinic dates), limit, offset
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vet: VetModuleService = req.scope.resolve(VET_MODULE)
  const q = req.query as Record<string, string | undefined>

  const filters: Record<string, unknown> = {}
  if (q.provider_id) {
    filters.provider_id = q.provider_id
  }
  if (q.status) {
    filters.status = q.status.split(",")
  }
  const range: Record<string, Date> = {}
  if (q.from) {
    if (!isValidDate(q.from)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "from must be a date like 2026-10-12")
    }
    range.$gte = dayStartUtc(q.from)
  }
  if (q.to) {
    if (!isValidDate(q.to)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "to must be a date like 2026-10-12")
    }
    range.$lt = new Date(dayStartUtc(q.to).getTime() + 86_400_000)
  }
  if (Object.keys(range).length) {
    filters.starts_at = range
  }

  const take = Math.min(Math.max(Number(q.limit) || 50, 1), 200)
  const skip = Math.max(Number(q.offset) || 0, 0)
  const [appointments, count] = await vet.listAndCountVetAppointments(filters, {
    relations: ["provider"],
    order: { starts_at: "ASC" },
    take,
    skip,
  })
  res.json({ appointments, count, limit: take, offset: skip })
}
