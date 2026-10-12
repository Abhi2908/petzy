import { InsurancePlan } from "@lib/data/insurance"
import { ageText, petTypesText, rupees } from "@lib/util/insurance-format"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PartnerLogo from "../partner-logo"

const PlanCard = ({ plan, query }: { plan: InsurancePlan; query: string }) => (
  <LocalizedClientLink
    href={`/insurance/${plan.id}${query ? `?${query}` : ""}`}
    className="group flex h-full flex-col gap-4 rounded-large border border-petzy-border bg-white p-5 transition-shadow hover:shadow-elevation-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-petzy-teal"
    data-testid="insurance-plan-card"
  >
    <div className="flex items-center gap-3">
      <PartnerLogo name={plan.partner.name} logoUrl={plan.partner.logo_url} />
      <div className="min-w-0">
        <p className="text-small-regular text-ui-fg-subtle truncate">
          {plan.partner.name}
        </p>
        <h3 className="text-lg font-semibold leading-6 group-hover:text-petzy-coral">
          {plan.name}
        </h3>
      </div>
    </div>
    <div className="flex flex-wrap items-end justify-between gap-2">
      <p className="text-ui-fg-base">
        <span className="text-xl font-semibold">
          from {rupees(plan.annual_premium_from)}
        </span>{" "}
        <span className="text-small-regular text-ui-fg-subtle">a year</span>
      </p>
      <p className="text-small-regular text-ui-fg-subtle">
        Cover up to {rupees(plan.cover_amount)}
      </p>
    </div>
    {plan.highlights.length > 0 && (
      <ul className="flex flex-col gap-1.5 text-small-regular text-ui-fg-base">
        {plan.highlights.slice(0, 3).map((h) => (
          <li key={h} className="flex gap-2">
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mt-0.5 shrink-0 text-petzy-teal"
            >
              <path d="M7.6 14.2 3.4 10l1.4-1.4 2.8 2.8 7.6-7.6L16.6 5z" />
            </svg>
            {h}
          </li>
        ))}
      </ul>
    )}
    <p className="mt-auto text-xs text-ui-fg-subtle">
      For {petTypesText(plan.pet_types)} aged {ageText(plan.min_age_months)} to{" "}
      {ageText(plan.max_age_months)}
    </p>
  </LocalizedClientLink>
)

export default PlanCard
