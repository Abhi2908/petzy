"use client"

import { INSURANCE_PET_TYPES } from "@lib/util/insurance-format"
import { Button } from "@modules/common/components/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState } from "react"

const inputClass =
  "h-10 w-full rounded-md border border-ui-border-base bg-white px-3 text-small-regular focus:outline-none focus:ring-2 focus:ring-petzy-teal"

// The filters live in the URL (pet_type, pet_age_months, max_premium, the same names as the API), so a
// filtered list can be shared and is rendered on the server. Age is typed as years and months.
const PlanFilters = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [open, setOpen] = useState(false)

  const age = Number(params.get("pet_age_months"))
  const hasAge = params.get("pet_age_months") !== null && Number.isFinite(age)
  const active = ["pet_type", "pet_age_months", "max_premium"].filter((k) =>
    params.get(k)
  ).length

  const apply = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const next = new URLSearchParams()
    const petType = String(form.get("pet_type") ?? "")
    if (petType) {
      next.set("pet_type", petType)
    }
    const years = String(form.get("age_years") ?? "").trim()
    const months = String(form.get("age_months") ?? "").trim()
    if (years || months) {
      next.set(
        "pet_age_months",
        String(Number(years || 0) * 12 + Number(months || 0))
      )
    }
    const premium = String(form.get("max_premium") ?? "").trim()
    if (premium) {
      next.set("max_premium", premium)
    }
    setOpen(false)
    router.push(next.size ? `${pathname}?${next}` : pathname)
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="secondary"
        className="self-start small:hidden"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="insurance-filters"
      >
        {open ? "Hide filters" : active ? `Filters (${active})` : "Filters"}
      </Button>
      <form
        id="insurance-filters"
        key={params.toString()}
        onSubmit={apply}
        className={`${
          open ? "grid" : "hidden"
        } small:grid grid-cols-2 small:grid-cols-[1fr_1fr_1fr_1fr_auto] items-end gap-3 rounded-large border border-petzy-border bg-white p-4`}
        data-testid="insurance-filters"
      >
        <label className="col-span-2 small:col-span-1 flex flex-col gap-1 text-small-regular">
          Pet type
          <select
            name="pet_type"
            defaultValue={params.get("pet_type") ?? ""}
            className={inputClass}
          >
            <option value="">Any pet</option>
            {INSURANCE_PET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-small-regular">
          Pet age: years
          <input
            name="age_years"
            type="number"
            min={0}
            max={30}
            inputMode="numeric"
            placeholder="Years"
            defaultValue={hasAge ? Math.floor(age / 12) : ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-small-regular">
          and months
          <input
            name="age_months"
            type="number"
            min={0}
            max={11}
            inputMode="numeric"
            placeholder="Months"
            defaultValue={hasAge ? age % 12 : ""}
            className={inputClass}
          />
        </label>
        <label className="col-span-2 small:col-span-1 flex flex-col gap-1 text-small-regular">
          Max yearly premium (Rs)
          <input
            name="max_premium"
            type="number"
            min={0}
            step={100}
            inputMode="numeric"
            placeholder="Any"
            defaultValue={params.get("max_premium") ?? ""}
            className={inputClass}
          />
        </label>
        <div className="col-span-2 small:col-span-1 flex gap-2">
          <Button type="submit" className="flex-1 small:flex-none">
            Show plans
          </Button>
          {active > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(pathname)}
            >
              Clear
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

export default PlanFilters
