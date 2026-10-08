// Shapes insurance records for the Store API. Customers see a plan and its partner's public face (name,
// logo, website). Partner contact details and notes, and everything about leads beyond a receipt, stay
// in Admin.

type PartnerRecord = { id: string; name: string; logo_url: string | null; website_url: string | null }

type PlanRecord = {
  id: string
  name: string
  description: string | null
  pet_types: string[]
  min_age_months: number
  max_age_months: number
  annual_premium_from: number
  cover_amount: number
  highlights: string[]
  exclusions: string[]
  partner: PartnerRecord
}

export function publicPlan(plan: PlanRecord) {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    pet_types: plan.pet_types,
    min_age_months: plan.min_age_months,
    max_age_months: plan.max_age_months,
    annual_premium_from: plan.annual_premium_from,
    cover_amount: plan.cover_amount,
    highlights: plan.highlights ?? [],
    exclusions: plan.exclusions ?? [],
    partner: {
      id: plan.partner.id,
      name: plan.partner.name,
      logo_url: plan.partner.logo_url,
      website_url: plan.partner.website_url,
    },
  }
}
