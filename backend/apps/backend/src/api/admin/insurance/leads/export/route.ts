import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INSURANCE_MODULE } from "../../../../../modules/insurance"
import InsuranceModuleService from "../../../../../modules/insurance/service"
import { toCsv } from "../../../../../modules/insurance/utils/rules"
import { leadFilters } from "../../helpers"

const MAX_ROWS = 10_000

const indiaTime = (d: Date | string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(d))
    .replace(",", "")

// CSV of the leads matching the same filters as the list (status, plan_id, partner_id, from, to), newest
// first, up to 10,000 rows. Starts with a UTF-8 byte order mark so Excel shows ₹ and Indian names correctly.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const insurance: InsuranceModuleService = req.scope.resolve(INSURANCE_MODULE)
  const q = req.query as Record<string, string | undefined>
  const leads = await insurance.listInsuranceLeads(await leadFilters(insurance, q), {
    relations: ["plan", "plan.partner"],
    order: { created_at: "DESC" },
    take: MAX_ROWS,
  })

  const csv = toCsv(
    ["Received (India time)", "Status", "Name", "Phone", "Email", "Pet name", "Pet type", "Breed", "Pet age (months)",
      "City", "PIN code", "Message", "Plan", "Partner", "Internal notes", "Lead id"],
    leads.map((l) => [
      indiaTime(l.created_at),
      l.status,
      l.customer_name,
      l.phone,
      l.email,
      l.pet_name,
      l.pet_type,
      l.breed,
      l.pet_age_months,
      l.city,
      l.pincode,
      l.message,
      l.plan.name,
      l.plan.partner.name,
      l.internal_notes,
      l.id,
    ])
  )

  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())
  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader("Content-Disposition", `attachment; filename="insurance-leads-${day}.csv"`)
  res.setHeader("Cache-Control", "no-store")
  res.send(`﻿${csv}`)
}
