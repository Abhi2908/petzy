import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { VET_MODULE } from "../../../../../../modules/vet"
import VetModuleService from "../../../../../../modules/vet/service"
import { CLINIC_UTC_OFFSET_MINUTES, clinicDateOf, generateSlots, isValidDate } from "../../../../../../modules/vet/utils/slots"

const MAX_DAYS_AHEAD = 60

// GET /store/vet/providers/:id/slots?date=2026-10-12  ->  open slots that day (clinic local date)
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const date = String((req.query as Record<string, string | undefined>).date ?? "")
  if (!isValidDate(date)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "date is required, like 2026-10-12")
  }
  const now = new Date()
  const today = clinicDateOf(now)
  const lastDay = clinicDateOf(new Date(now.getTime() + MAX_DAYS_AHEAD * 86_400_000))
  if (date < today || date > lastDay) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Choose a date between ${today} and ${lastDay}`)
  }

  const vet: VetModuleService = req.scope.resolve(VET_MODULE)
  const [provider] = await vet.listVetProviders({ id: req.params.id, status: "active" }, { relations: ["working_hours"] })
  if (!provider) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "This vet provider is not available for booking")
  }

  const dayStart = new Date(Date.parse(`${date}T00:00:00Z`) - CLINIC_UTC_OFFSET_MINUTES * 60_000)
  const booked = await vet.listVetAppointments({
    provider_id: provider.id,
    starts_at: { $gte: dayStart, $lt: new Date(dayStart.getTime() + 86_400_000) },
  })

  const slots = generateSlots({
    date,
    slotMinutes: provider.slot_minutes,
    hours: provider.working_hours,
    booked: booked.filter((a) => a.status !== "cancelled"),
    now,
  })

  res.json({
    provider: { id: provider.id, name: provider.name, consultation_fee: provider.consultation_fee, slot_minutes: provider.slot_minutes },
    date,
    timezone: "Asia/Kolkata",
    slots,
  })
}
