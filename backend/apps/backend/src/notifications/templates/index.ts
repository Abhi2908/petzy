// All Petzy email templates, in one place. Each returns { subject, html, text }.
export * from "./layout"
export * from "./insurance"
export * from "./mates"
export * from "./orders"
export * from "./vet"

/** Template names stored on notification records (and used by the tests). */
export const TEMPLATES = {
  VET_BOOKED_CUSTOMER: "vet.appointment.booked.customer",
  VET_BOOKED_PROVIDER: "vet.appointment.booked.provider",
  VET_CANCELLED_CUSTOMER: "vet.appointment.cancelled.customer",
  VET_CANCELLED_PROVIDER: "vet.appointment.cancelled.provider",
  MATES_OFFER_RECEIVED: "mates.offer.received",
  MATES_OFFER_COUNTERED: "mates.offer.countered",
  MATES_OFFER_REJECTED: "mates.offer.rejected",
  MATES_OFFER_ACCEPTED: "mates.offer.accepted",
  MATES_MESSAGE_RECEIVED: "mates.message.received",
  MATES_LISTING_APPROVED: "mates.listing.approved",
  MATES_LISTING_REJECTED: "mates.listing.rejected",
  INSURANCE_LEAD_ADMIN: "insurance.lead.admin",
  ORDER_CONFIRMATION: "order.confirmation",
} as const
