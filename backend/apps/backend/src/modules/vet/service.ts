import { MedusaService } from "@medusajs/framework/utils"
import VetAppointment from "./models/vet-appointment"
import VetProvider from "./models/vet-provider"
import VetWorkingHour from "./models/vet-working-hour"

class VetModuleService extends MedusaService({
  VetProvider,
  VetWorkingHour,
  VetAppointment,
}) {}

export default VetModuleService
