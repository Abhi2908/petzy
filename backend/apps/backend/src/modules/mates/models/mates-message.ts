import { model } from "@medusajs/framework/utils"
import MatesOffer from "./mates-offer"

const MatesMessage = model.define("mates_message", {
  id: model.id({ prefix: "matm" }).primaryKey(),
  sender: model.enum(["buyer", "seller"]),
  body: model.text(),
  offer: model.belongsTo(() => MatesOffer, { mappedBy: "messages" }),
})

export default MatesMessage
