// Events the insurance workflows emit after they succeed. Subscribers (notifications) listen to these.
export const INSURANCE_EVENTS = {
  LEAD_CREATED: "insurance.lead.created", // { id }
} as const
