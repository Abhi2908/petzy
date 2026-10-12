import { Metadata } from "next"

import { getInsurancePlan } from "@lib/data/insurance"
import InsurancePlanTemplate from "@modules/insurance/templates/plan"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params
  const result = await getInsurancePlan(id)
  return result.data
    ? {
        title: `${result.data.plan.name}: pet insurance`,
        description: `Offered by ${result.data.plan.partner.name}.`,
      }
    : { title: "Pet insurance plan" }
}

export default async function InsurancePlanPage(props: Props) {
  const { id } = await props.params
  const search = await props.searchParams
  const petType =
    typeof search.pet_type === "string" ? search.pet_type : undefined
  const age =
    typeof search.pet_age_months === "string"
      ? Number(search.pet_age_months)
      : NaN
  const back = new URLSearchParams()
  for (const key of ["pet_type", "pet_age_months", "max_premium"]) {
    const value = search[key]
    if (typeof value === "string" && value) {
      back.set(key, value)
    }
  }
  return (
    <InsurancePlanTemplate
      id={id}
      prefill={{
        petType,
        ageMonths: Number.isInteger(age) && age >= 0 ? age : undefined,
      }}
      backQuery={back.toString()}
    />
  )
}
