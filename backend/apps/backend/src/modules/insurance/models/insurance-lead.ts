import { model } from "@medusajs/framework/utils"
import InsurancePlan from "./insurance-plan"

export const LEAD_STATUSES = ["new", "contacted", "sent_to_partner", "converted", "closed"] as const

// A customer asking to be put in touch with a partner about one plan. Guests can send these.
const InsuranceLead = model
  .define("insurance_lead", {
    id: model.id({ prefix: "insl" }).primaryKey(),
    customer_name: model.text(),
    phone: model.text(), // as the customer typed it
    phone_key: model.text(), // last 10 digits, used for the daily limit (see utils/rules.ts)
    email: model.text().nullable(),
    pet_name: model.text().nullable(),
    pet_type: model.text(),
    breed: model.text().nullable(),
    pet_age_months: model.number(),
    city: model.text().nullable(),
    pincode: model.text().nullable(),
    message: model.text().nullable(),
    status: model.enum([...LEAD_STATUSES]).default("new"),
    internal_notes: model.text().nullable(), // staff only, never shown to the customer
    plan: model.belongsTo(() => InsurancePlan, { mappedBy: "leads" }),
  })
  .indexes([{ on: ["phone_key", "created_at"] }, { on: ["status", "created_at"] }])

export default InsuranceLead
