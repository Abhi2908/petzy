import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { VET_MODULE } from "../modules/vet"
import { VET_EVENTS } from "../modules/vet/events"
import VetModuleService from "../modules/vet/service"
import { sendEmail } from "../notifications/send"
import { runNotification } from "../notifications/run"
import { TEMPLATES, vetCancelledForCustomer, vetCancelledForProvider } from "../notifications/templates"

// When an appointment becomes cancelled (and was not already), tell the customer and the clinic.
// Other status changes (confirmed, completed, no show) send nothing.
export default async function vetAppointmentUpdated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; previous_status: string }>) {
  await runNotification(container, `vet appointment update ${data.id}`, async () => {
    const vet: VetModuleService = container.resolve(VET_MODULE)
    const a = await vet.retrieveVetAppointment(data.id, { relations: ["provider"] })
    if (a.status !== "cancelled" || data.previous_status === "cancelled") {
      return
    }
    const resource = { type: "vet_appointment", id: a.id }
    const stamp = new Date(a.updated_at).toISOString()
    await sendEmail(container, {
      group: "vet",
      template: TEMPLATES.VET_CANCELLED_CUSTOMER,
      to: a.customer_email,
      email: vetCancelledForCustomer(a),
      resource,
      idempotencyKey: `${TEMPLATES.VET_CANCELLED_CUSTOMER}:${a.id}:${stamp}`,
    })
    await sendEmail(container, {
      group: "vet",
      template: TEMPLATES.VET_CANCELLED_PROVIDER,
      to: a.provider.email,
      email: vetCancelledForProvider(a),
      resource,
      idempotencyKey: `${TEMPLATES.VET_CANCELLED_PROVIDER}:${a.id}:${stamp}`,
    })
  })
}

export const config: SubscriberConfig = { event: VET_EVENTS.APPOINTMENT_UPDATED }
