import { listInsurancePlans } from "@lib/data/insurance"
import Notice from "@modules/common/components/notice"
import { Text } from "@modules/common/components/ui"
import InsuranceDisclaimer from "@modules/insurance/components/disclaimer"
import PlanCard from "@modules/insurance/components/plan-card"
import PlanFilters from "@modules/insurance/components/plan-filters"

const FILTERS = ["pet_type", "pet_age_months", "max_premium"] as const
export type PlansSearchParams = Record<string, string | string[] | undefined>

const InsurancePlansTemplate = async ({
  searchParams,
}: {
  searchParams: PlansSearchParams
}) => {
  const query: Record<string, string> = {}
  for (const key of FILTERS) {
    const value = searchParams[key]
    if (typeof value === "string" && value.trim()) {
      query[key] = value.trim()
    }
  }
  const filtered = Object.keys(query).length > 0
  const queryString = new URLSearchParams(query).toString()
  const result = await listInsurancePlans(query)

  return (
    <div
      className="content-container py-6 small:py-12 flex flex-col gap-6"
      data-testid="insurance-plans"
    >
      <InsuranceDisclaimer />
      <div className="max-w-2xl">
        <h1 className="text-3xl small:text-4xl font-semibold mb-2">
          Pet insurance
        </h1>
        <Text className="text-ui-fg-subtle">
          Compare plans from our insurance partners and ask for a quote. The
          partner contacts you directly.
        </Text>
      </div>

      <PlanFilters />

      {result.error !== undefined ? (
        <Notice tone="error" title="We could not load the plans." retry>
          {result.error}
        </Notice>
      ) : result.data.plans.length === 0 ? (
        <Notice
          tone="empty"
          title={
            filtered
              ? "No plans match, try different filters."
              : "No plans are available right now."
          }
          action={
            filtered
              ? { href: "/insurance", label: "Clear filters" }
              : undefined
          }
        >
          {filtered
            ? "For example a different age or a higher premium."
            : "Please check back soon."}
        </Notice>
      ) : (
        <>
          <Text className="text-small-regular text-ui-fg-subtle">
            {result.data.count} {result.data.count === 1 ? "plan" : "plans"}
          </Text>
          <ul className="grid grid-cols-1 xsmall:grid-cols-2 medium:grid-cols-3 gap-4">
            {result.data.plans.map((plan) => (
              <li key={plan.id}>
                <PlanCard plan={plan} query={queryString} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default InsurancePlansTemplate
