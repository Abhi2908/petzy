import { model } from "@medusajs/framework/utils"
import MatesOffer from "./mates-offer"
import MatesReport from "./mates-report"

export const LISTING_STATUSES = ["pending_review", "active", "rejected", "reserved", "sold", "expired", "removed"] as const
export const PET_TYPES = ["dog", "cat", "bird", "fish", "other"] as const
export const GENDERS = ["male", "female"] as const
export const SELLER_TYPES = ["individual", "breeder"] as const

// A pet posted for sale by a customer. seller_phone is private: it is only ever shown to the buyer
// of an accepted offer (and to Admin), never in listing responses.
const MatesListing = model
  .define("mates_listing", {
    id: model.id({ prefix: "matl" }).primaryKey(),
    seller_customer_id: model.text(), // plain text, not a module link
    title: model.text(),
    pet_type: model.enum([...PET_TYPES]),
    breed: model.text(),
    gender: model.enum([...GENDERS]),
    age_months: model.number(),
    color: model.text().nullable(),
    vaccinated: model.boolean().default(false),
    dewormed: model.boolean().default(false),
    has_papers: model.boolean().default(false),
    description: model.text().nullable(),
    price: model.number(), // whole rupees
    price_negotiable: model.boolean().default(false),
    city: model.text(),
    state: model.text(),
    pincode: model.text(),
    image_urls: model.array().default([]), // at most 8
    seller_type: model.enum([...SELLER_TYPES]).default("individual"),
    breeder_registration_no: model.text().nullable(),
    seller_phone: model.text(),
    status: model.enum([...LISTING_STATUSES]).default("pending_review"),
    rejection_reason: model.text().nullable(),
    expires_at: model.dateTime().nullable(), // 60 days after approval
    offers: model.hasMany(() => MatesOffer, { mappedBy: "listing" }),
    reports: model.hasMany(() => MatesReport, { mappedBy: "listing" }),
  })
  .indexes([
    { on: ["status", "created_at"] },
    { on: ["seller_customer_id"] },
  ])

export default MatesListing
