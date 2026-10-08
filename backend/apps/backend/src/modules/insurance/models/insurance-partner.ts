import { model } from "@medusajs/framework/utils"
import InsurancePlan from "./insurance-plan"

// An insurer Petzy refers customers to. Petzy does not sell or underwrite insurance itself.
// contact_email, contact_phone and notes are for Petzy staff only and never shown to customers.
const InsurancePartner = model.define("insurance_partner", {
  id: model.id({ prefix: "insp" }).primaryKey(),
  name: model.text(),
  logo_url: model.text().nullable(),
  website_url: model.text().nullable(),
  contact_email: model.text().nullable(),
  contact_phone: model.text().nullable(),
  notes: model.text().nullable(),
  status: model.enum(["active", "inactive"]).default("active"),
  plans: model.hasMany(() => InsurancePlan, { mappedBy: "partner" }),
})

export default InsurancePartner
