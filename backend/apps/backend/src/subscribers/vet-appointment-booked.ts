import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { VET_MODULE } from "../modules/vet"
import { VET_EVENTS } from "../modules/vet/events"
import VetModuleService from "../modules/vet/service"
import { sendEmail } from "../notifications/send"
import { runNotification } from "../notifications/run"
import { TEMPLATES, vetBookedForCustomer, vetBookedForProvider } from "../notifications/templates"

// A booking emails the customer (when they gave an email) and the clinic's contact email.
export default async function vetAppointmentBooked({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  await runNotification(container, `vet booking ${data.id}`, async () => {
    const vet: VetModuleService = container.resolve(VET_MODULE)
    const a = await vet.retrieveVetAppointment(data.id, { relations: ["provider"] })
    const resource = { type: "vet_appointment", id: a.id }
    await sendEmail(container, {
      group: "vet",
      template: TEMPLATES.VET_BOOKED_CUSTOMER,
      to: a.customer_email,
      email: vetBookedForCustomer(a),
      resource,
      idempotencyKey: `${TEMPLATES.VET_BOOKED_CUSTOMER}:${a.id}`,
    })
    await sendEmail(container, {
      group: "vet",
      template: TEMPLATES.VET_BOOKED_PROVIDER,
      to: a.provider.email,
      email: vetBookedForProvider(a),
      resource,
      idempotencyKey: `${TEMPLATES.VET_BOOKED_PROVIDER}:${a.id}`,
    })
  })
}

export const config: SubscriberConfig = { event: VET_EVENTS.APPOINTMENT_BOOKED }
