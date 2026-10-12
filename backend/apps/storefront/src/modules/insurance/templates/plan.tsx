import { getInsurancePlan } from "@lib/data/insurance"
import { ageText, petTypesText, rupees } from "@lib/util/insurance-format"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Notice from "@modules/common/components/notice"
import { Text } from "@modules/common/components/ui"
import InsuranceDisclaimer from "@modules/insurance/components/disclaimer"
import PartnerLogo from "@modules/insurance/components/partner-logo"
import QuoteForm from "@modules/insurance/components/quote-form"

const List = ({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: "yes" | "no"
}) =>
  items.length ? (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-ui-fg-base">
            <span
              aria-hidden="true"
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                tone === "yes" ? "bg-petzy-teal" : "bg-rose-400"
              }`}
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  ) : null

const InsurancePlanTemplate = async ({
  id,
  prefill,
  backQuery,
}: {
  id: string
  prefill: { petType?: string; ageMonths?: number }
  backQuery: string
}) => {
  const result = await getInsurancePlan(id)

  if (result.error !== undefined) {
    return (
      <div className="content-container py-12 max-w-2xl flex flex-col gap-6">
        <InsuranceDisclaimer />
        {result.status === 404 ? (
          <Notice
            tone="empty"
            title="This plan is no longer available."
            action={{ href: "/insurance", label: "See all plans" }}
          />
        ) : (
          <Notice tone="error" title="We could not load this plan." retry>
            {result.error}
          </Notice>
        )}
      </div>
    )
  }

  const plan = result.data.plan

  return (
    <div
      className="content-container py-6 small:py-12 flex flex-col gap-6"
      data-testid="insurance-plan"
    >
      <InsuranceDisclaimer />
      <LocalizedClientLink
        href={`/insurance${backQuery ? `?${backQuery}` : ""}`}
        className="text-small-regular text-ui-fg-subtle hover:text-petzy-coral"
      >
        &larr; All plans
      </LocalizedClientLink>

      <div className="grid grid-cols-1 small:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-8">
        <div className="flex flex-col gap-6 min-w-0">
          <div className="flex items-center gap-4">
            <PartnerLogo
              name={plan.partner.name}
              logoUrl={plan.partner.logo_url}
              className="h-16 w-16"
            />
            <div>
              <p className="text-small-regular text-ui-fg-subtle">
                Offered by{" "}
                {plan.partner.website_url ? (
                  <a
                    href={plan.partner.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-petzy-teal underline"
                  >
                    {plan.partner.name}
                  </a>
                ) : (
                  plan.partner.name
                )}
              </p>
              <h1 className="text-2xl small:text-3xl font-semibold">
                {plan.name}
              </h1>
            </div>
          </div>

          <dl className="grid grid-cols-1 xsmall:grid-cols-3 gap-4 rounded-large border border-petzy-border bg-white p-5">
            <div>
              <dt className="text-xs text-ui-fg-subtle">Yearly premium</dt>
              <dd className="text-lg font-semibold">
                from {rupees(plan.annual_premium_from)} a year
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ui-fg-subtle">Cover</dt>
              <dd className="text-lg font-semibold">
                up to {rupees(plan.cover_amount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ui-fg-subtle">Covers</dt>
              <dd className="text-ui-fg-base">
                {petTypesText(plan.pet_types)}, aged{" "}
                {ageText(plan.min_age_months)} to {ageText(plan.max_age_months)}
              </dd>
            </div>
          </dl>

          {plan.description && (
            <Text className="whitespace-pre-line text-ui-fg-base">
              {plan.description}
            </Text>
          )}
          <List title="What it covers" items={plan.highlights} tone="yes" />
          <List
            title="What it does not cover"
            items={plan.exclusions}
            tone="no"
          />
          <Text className="text-xs text-ui-fg-subtle">
            Premiums are indicative. {plan.partner.name} confirms the price and
            the full terms when they quote.
          </Text>
        </div>

        <aside className="small:sticky small:top-20 small:self-start">
          <div className="rounded-large border border-petzy-border bg-white p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold">Get a quote</h2>
              <Text className="text-small-regular text-ui-fg-subtle">
                No account needed. {plan.partner.name} will contact you about
                this plan.
              </Text>
            </div>
            <QuoteForm plan={plan} prefill={prefill} />
          </div>
        </aside>
      </div>
    </div>
  )
}

export default InsurancePlanTemplate
