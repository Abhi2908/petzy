import { model } from "@medusajs/framework/utils"
import VetProvider from "./vet-provider"

// One block of working time on one weekday. A provider can have several blocks per day
// (for example a morning and an evening shift). Times are clinic local time (India, IST).
const VetWorkingHour = model.define("vet_working_hour", {
  id: model.id({ prefix: "vetwh" }).primaryKey(),
  weekday: model.number(), // 0 = Sunday ... 6 = Saturday
  start_time: model.text(), // "09:00"
  end_time: model.text(), // "17:00"
  provider: model.belongsTo(() => VetProvider, { mappedBy: "working_hours" }),
})

export default VetWorkingHour
