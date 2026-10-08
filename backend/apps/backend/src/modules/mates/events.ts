// Events the Mates workflows emit after they succeed. Subscribers (notifications) listen to these.
export const MATES_EVENTS = {
  OFFER_CREATED: "mates.offer.created", // { id }
  OFFER_UPDATED: "mates.offer.updated", // { id, action, side, closed_offer_ids }
  MESSAGE_CREATED: "mates.message.created", // { id }
  LISTING_MODERATED: "mates.listing.moderated", // { id, action }
} as const
