import { model } from "@medusajs/framework/utils"
import VetAppointment from "./vet-appointment"
import VetWorkingHour from "./vet-working-hour"

const VetProvider = model.define("vet_provider", {
  id: model.id({ prefix: "vetp" }).primaryKey(),
  name: model.text(),
  clinic_name: model.text(),
  city: model.text(),
  phone: model.text().nullable(),
  email: model.text().nullable(),
  specialties: model.text().nullable(), // comma separated, for example "Dogs, Cats"
  consultation_fee: model.number().default(0), // rupees, paid at the clinic
  slot_minutes: model.number().default(30),
  status: model.enum(["active", "inactive"]).default("active"),
  working_hours: model.hasMany(() => VetWorkingHour, { mappedBy: "provider" }),
  appointments: model.hasMany(() => VetAppointment, { mappedBy: "provider" }),
})

export default VetProvider
