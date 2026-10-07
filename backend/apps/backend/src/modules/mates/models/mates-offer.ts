import { model } from "@medusajs/framework/utils"
import MatesListing from "./mates-listing"
import MatesMessage from "./mates-message"

// open = waiting for the seller, countered = waiting for the buyer.
export const OFFER_STATUSES = ["open", "countered", "accepted", "rejected", "withdrawn"] as const
export const LIVE_OFFER_STATUSES = ["open", "countered"] as const
export const OFFER_SIDES = ["buyer", "seller"] as const

// buyer_phone is private: it is only shown to the seller once this offer is accepted (and to Admin).
const MatesOffer = model
  .define("mates_offer", {
    id: model.id({ prefix: "mato" }).primaryKey(),
    buyer_customer_id: model.text(),
    buyer_phone: model.text(),
    amount: model.number(), // whole rupees
    status: model.enum([...OFFER_STATUSES]).default("open"),
    last_actor: model.enum([...OFFER_SIDES]).default("buyer"),
    listing: model.belongsTo(() => MatesListing, { mappedBy: "offers" }),
    messages: model.hasMany(() => MatesMessage, { mappedBy: "offer" }),
  })
  .indexes([
    { on: ["buyer_customer_id"] },
    {
      // One live offer per buyer per listing.
      on: ["listing_id", "buyer_customer_id"],
      unique: true,
      where: "status IN ('open', 'countered')",
    },
    {
      // A listing can only be reserved for one buyer at a time.
      on: ["listing_id"],
      unique: true,
      where: "status = 'accepted'",
    },
  ])

export default MatesOffer
