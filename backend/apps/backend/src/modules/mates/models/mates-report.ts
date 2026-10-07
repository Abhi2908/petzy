import { model } from "@medusajs/framework/utils"
import MatesListing from "./mates-listing"

export const REPORT_STATUSES = ["open", "resolved"] as const

const MatesReport = model
  .define("mates_report", {
    id: model.id({ prefix: "matr" }).primaryKey(),
    reporter_customer_id: model.text(),
    reason: model.text(),
    status: model.enum([...REPORT_STATUSES]).default("open"),
    listing: model.belongsTo(() => MatesListing, { mappedBy: "reports" }),
  })
  .indexes([{ on: ["status"] }])

export default MatesReport
