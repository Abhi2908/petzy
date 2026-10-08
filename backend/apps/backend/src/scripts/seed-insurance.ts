/**
 * Adds two SAMPLE insurance partners with four plans so the insurance screens have something to show.
 *
 *   npm run seed:insurance
 *
 * Safe to re-run: partners and plans with the same name are skipped. The insurers are made up (no real
 * company names), the links point at example.com and the numbers are placeholders. Delete them in
 * Admin > Insurance before adding your real partners.
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { INSURANCE_MODULE } from "../modules/insurance"
import InsuranceModuleService from "../modules/insurance/service"
import { createInsurancePartnerWorkflow } from "../workflows/create-insurance-partner"
import { createInsurancePlanWorkflow, InsurancePlanInput } from "../workflows/create-insurance-plan"

const PARTNERS: { name: string; website_url: string; contact_email: string; plans: Omit<InsurancePlanInput, "partner_id">[] }[] = [
  {
    name: "Example Pet Cover Co. (sample)",
    website_url: "https://example.com/pet-cover",
    contact_email: "partners@example.com",
    plans: [
      {
        name: "Basic Accident Cover (sample)",
        description: "Accidents and emergency treatment for dogs and cats.",
        pet_types: ["dog", "cat"],
        min_age_months: 2,
        max_age_months: 120,
        annual_premium_from: 1999,
        cover_amount: 50000,
        highlights: ["Accident and emergency vet bills", "Cashless at partner clinics", "No medical check needed"],
        exclusions: ["Illness", "Existing conditions", "Routine vaccinations"],
        sort_order: 10,
      },
      {
        name: "Complete Care (sample)",
        description: "Accidents, illness and surgery for dogs and cats.",
        pet_types: ["dog", "cat"],
        min_age_months: 3,
        max_age_months: 96,
        annual_premium_from: 5499,
        cover_amount: 200000,
        highlights: ["Illness and surgery", "Hospital stays", "Third-party liability"],
        exclusions: ["Existing conditions", "Cosmetic procedures", "Breeding costs"],
        sort_order: 20,
      },
    ],
  },
  {
    name: "Demo Animal Health Insurance (sample)",
    website_url: "https://example.com/animal-health",
    contact_email: "leads@example.com",
    plans: [
      {
        name: "Senior Pet Plan (sample)",
        description: "Cover for older dogs and cats, including common age-related illness.",
        pet_types: ["dog", "cat"],
        min_age_months: 84,
        max_age_months: 168,
        annual_premium_from: 7999,
        cover_amount: 150000,
        highlights: ["Age-related illness", "Diagnostics and scans"],
        exclusions: ["Existing conditions in the first year", "Dental care"],
        sort_order: 30,
      },
      {
        name: "Small Pets and Birds (sample)",
        description: "Accident and illness cover for birds and other small pets.",
        pet_types: ["bird", "other"],
        min_age_months: 1,
        max_age_months: 120,
        annual_premium_from: 999,
        cover_amount: 25000,
        highlights: ["Avian and exotic vets", "Accident and illness"],
        exclusions: ["Existing conditions"],
        sort_order: 40,
      },
    ],
  },
]

export default async function seedInsurance({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const insurance: InsuranceModuleService = container.resolve(INSURANCE_MODULE)
  const created: string[] = []

  for (const { plans, ...partnerData } of PARTNERS) {
    let [partner] = await insurance.listInsurancePartners({ name: partnerData.name })
    if (!partner) {
      const { result: id } = await createInsurancePartnerWorkflow(container).run({
        input: { ...partnerData, contact_phone: "+91 90000 20000", notes: "Sample partner for testing. Not a real insurer." },
      })
      partner = await insurance.retrieveInsurancePartner(id)
      created.push(partner.name)
    }
    const existing = await insurance.listInsurancePlans({ partner_id: partner.id }, { select: ["name"] })
    for (const plan of plans) {
      if (existing.some((p) => p.name === plan.name)) {
        continue
      }
      await createInsurancePlanWorkflow(container).run({ input: { ...plan, partner_id: partner.id } })
      created.push(plan.name)
    }
  }

  logger.info(created.length ? `Sample insurance data created: ${created.join(", ")}` : "Sample insurance data already exists.")
}
