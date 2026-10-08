import { model } from "@medusajs/framework/utils"
import InsuranceLead from "./insurance-lead"
import InsurancePartner from "./insurance-partner"

export const PET_TYPES = ["dog", "cat", "bird", "fish", "other"] as const

// One partner plan as Petzy lists it. Prices and cover are whole rupees and only indicative:
// the partner quotes the real premium.
const InsurancePlan = model
  .define("insurance_plan", {
    id: model.id({ prefix: "inspl" }).primaryKey(),
    name: model.text(),
    description: model.text().nullable(),
    pet_types: model.array(), // values from PET_TYPES
    min_age_months: model.number(),
    max_age_months: model.number(),
    annual_premium_from: model.number(),
    cover_amount: model.number(),
    highlights: model.array().default([]),
    exclusions: model.array().default([]),
    status: model.enum(["active", "inactive"]).default("active"),
    sort_order: model.number().default(0),
    partner: model.belongsTo(() => InsurancePartner, { mappedBy: "plans" }),
    leads: model.hasMany(() => InsuranceLead, { mappedBy: "plan" }),
  })
  .indexes([{ on: ["status", "sort_order"] }])

export default InsurancePlan
