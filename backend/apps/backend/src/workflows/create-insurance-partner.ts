import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { INSURANCE_MODULE } from "../modules/insurance"
import InsuranceModuleService from "../modules/insurance/service"

export type InsurancePartnerInput = {
  name: string
  logo_url?: string | null
  website_url?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  notes?: string | null
  status?: "active" | "inactive"
}

const createInsurancePartnerStep = createStep(
  "create-insurance-partner",
  async (input: InsurancePartnerInput, { container }) => {
    const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
    const partner = await insurance.createInsurancePartners(input)
    return new StepResponse(partner.id, partner.id)
  },
  async (id, { container }) => {
    if (!id) {
      return
    }
    const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
    await insurance.deleteInsurancePartners(id)
  }
)

export const createInsurancePartnerWorkflow = createWorkflow(
  "create-insurance-partner",
  (input: InsurancePartnerInput) => {
    const id = createInsurancePartnerStep(input)
    return new WorkflowResponse(id)
  }
)
