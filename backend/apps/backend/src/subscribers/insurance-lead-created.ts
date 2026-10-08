import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { INSURANCE_MODULE } from "../modules/insurance"
import { INSURANCE_EVENTS } from "../modules/insurance/events"
import InsuranceModuleService from "../modules/insurance/service"
import { runNotification } from "../notifications/run"
import { sendEmail } from "../notifications/send"
import { adminNotifyEmail } from "../notifications/settings"
import { indiaDateTime, insuranceLeadForAdmin, TEMPLATES } from "../notifications/templates"

// A new insurance lead emails Petzy's internal inbox (ADMIN_NOTIFY_EMAIL) with the lead's details.
export default async function insuranceLeadCreated({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  await runNotification(container, `insurance lead ${data.id}`, async () => {
    const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
    const lead = await insurance.retrieveInsuranceLead(data.id, { relations: ["plan", "plan.partner"] })
    const admin = `${process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"}/app/insurance?tab=leads`
    await sendEmail(container, {
      group: "insurance",
      template: TEMPLATES.INSURANCE_LEAD_ADMIN,
      to: adminNotifyEmail(),
      email: insuranceLeadForAdmin({ lead, adminLink: admin, receivedAt: indiaDateTime(lead.created_at) }),
      resource: { type: "insurance_lead", id: lead.id },
      idempotencyKey: `${TEMPLATES.INSURANCE_LEAD_ADMIN}:${lead.id}`,
    })
  })
}

export const config: SubscriberConfig = { event: INSURANCE_EVENTS.LEAD_CREATED }
