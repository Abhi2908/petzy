import { MedusaService } from "@medusajs/framework/utils"
import InsuranceLead from "./models/insurance-lead"
import InsurancePartner from "./models/insurance-partner"
import InsurancePlan from "./models/insurance-plan"

class InsuranceModuleService extends MedusaService({
  InsurancePartner,
  InsurancePlan,
  InsuranceLead,
}) {}

export default InsuranceModuleService
