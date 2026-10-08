import { ageText, button, detailsTable, paragraph, render, RenderedEmail, rupees } from "./layout"

// The internal email for a new insurance lead. It goes to Petzy staff (ADMIN_NOTIFY_EMAIL), so it carries
// the customer's phone and details: staff need them to follow up or pass the lead to the partner.

export type InsuranceLeadView = {
  id: string
  customer_name: string
  phone: string
  email: string | null
  pet_name: string | null
  pet_type: string
  breed: string | null
  pet_age_months: number
  city: string | null
  pincode: string | null
  message: string | null
  created_at: Date | string
  plan: { name: string; annual_premium_from: number; partner: { name: string } }
}

export function insuranceLeadForAdmin(p: { lead: InsuranceLeadView; adminLink: string; receivedAt: string }): RenderedEmail {
  const { lead } = p
  return render(
    `New insurance lead: ${lead.customer_name} for ${lead.plan.name}`,
    "New insurance lead",
    [
      paragraph(`${lead.customer_name} asked to hear from ${lead.plan.partner.name} about ${lead.plan.name}.`),
      detailsTable([
        ["Received", p.receivedAt],
        ["Name", lead.customer_name],
        ["Phone", lead.phone],
        ["Email", lead.email],
        ["Pet", [lead.pet_name, `${lead.pet_type}${lead.breed ? `, ${lead.breed}` : ""}`].filter(Boolean).join(" - ")],
        ["Pet age", ageText(lead.pet_age_months)],
        ["Location", [lead.city, lead.pincode].filter(Boolean).join(" ")],
        ["Plan", `${lead.plan.name} (from ${rupees(lead.plan.annual_premium_from)} a year)`],
        ["Partner", lead.plan.partner.name],
        ["Message", lead.message],
      ]),
      button("Open leads in Admin", p.adminLink),
    ],
    "Internal Petzy email. It contains a customer's personal details: do not forward it outside the team."
  )
}
