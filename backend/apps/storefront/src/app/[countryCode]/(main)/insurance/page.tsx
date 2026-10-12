import { Metadata } from "next"

import InsurancePlansTemplate, {
  PlansSearchParams,
} from "@modules/insurance/templates/plans"

export const metadata: Metadata = {
  title: "Pet insurance",
  description:
    "Compare pet insurance plans from our partners and ask for a quote.",
}

export const dynamic = "force-dynamic"

export default async function InsurancePage(props: {
  searchParams: Promise<PlansSearchParams>
}) {
  return <InsurancePlansTemplate searchParams={await props.searchParams} />
}
