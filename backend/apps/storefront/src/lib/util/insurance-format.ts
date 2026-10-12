// Labels and formatting for the insurance pages.

export const INSURANCE_PET_TYPES = [
  { value: "dog", label: "Dog", plural: "dogs" },
  { value: "cat", label: "Cat", plural: "cats" },
  { value: "bird", label: "Bird", plural: "birds" },
  { value: "fish", label: "Fish", plural: "fish" },
  { value: "other", label: "Other pet", plural: "other pets" },
] as const

export const DISCLAIMER =
  "Insurance is offered by our partners. Petzy does not sell or underwrite insurance."

/** Whole rupees, written the way the brief asks: "Rs 1,999". */
export function rupees(amount: number): string {
  return `Rs ${amount.toLocaleString("en-IN")}`
}

/** "dogs and cats", "birds, fish and other pets" */
export function petTypesText(types: string[]): string {
  const labels = types.map(
    (t) => INSURANCE_PET_TYPES.find((p) => p.value === t)?.plural ?? t
  )
  return labels.length > 1
    ? `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`
    : labels[0] ?? ""
}

/** "3 months", "1 year", "8 years 6 months" */
export function ageText(months: number): string {
  const plural = (n: number, word: string) =>
    `${n} ${word}${n === 1 ? "" : "s"}`
  if (months < 12) {
    return plural(months, "month")
  }
  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest
    ? `${plural(years, "year")} ${plural(rest, "month")}`
    : plural(years, "year")
}
