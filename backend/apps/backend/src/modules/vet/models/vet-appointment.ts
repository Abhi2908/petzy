import { model } from "@medusajs/framework/utils"
import VetProvider from "./vet-provider"

export const APPOINTMENT_STATUSES = ["booked", "confirmed", "completed", "cancelled", "no_show"] as const

const VetAppointment = model
  .define("vet_appointment", {
    id: model.id({ prefix: "vetapt" }).primaryKey(),
    customer_name: model.text(),
    customer_phone: model.text(),
    customer_email: model.text().nullable(),
    pet_name: model.text(),
    pet_type: model.text(), // dog, cat, fish, bird, ...
    reason: model.text().nullable(),
    starts_at: model.dateTime(),
    ends_at: model.dateTime(),
    status: model.enum([...APPOINTMENT_STATUSES]).default("booked"),
    notes: model.text().nullable(), // internal notes, not shown to customers
    provider: model.belongsTo(() => VetProvider, { mappedBy: "appointments" }),
  })
  .indexes([
    {
      // Two live appointments can never share the same provider and start time.
      on: ["provider_id", "starts_at"],
      unique: true,
      where: "status <> 'cancelled'",
    },
  ])

export default VetAppointment
