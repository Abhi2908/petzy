import { MedusaService } from "@medusajs/framework/utils"
import MatesListing from "./models/mates-listing"
import MatesMessage from "./models/mates-message"
import MatesOffer from "./models/mates-offer"
import MatesReport from "./models/mates-report"

class MatesModuleService extends MedusaService({
  MatesListing,
  MatesOffer,
  MatesMessage,
  MatesReport,
}) {}

export default MatesModuleService
