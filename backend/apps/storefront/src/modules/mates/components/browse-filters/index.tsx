"use client"

import { GENDERS, PET_TYPES, SORTS } from "@lib/util/mates-format"
import { Button } from "@modules/common/components/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState } from "react"

const FIELDS = [
  "pet_type",
  "breed",
  "city",
  "min_price",
  "max_price",
  "gender",
  "sort",
] as const

const inputClass =
  "h-10 w-full rounded-md border border-ui-border-base bg-white px-3 text-small-regular focus:outline-none focus:ring-2 focus:ring-petzy-teal"

// Filters live in the URL, so results can be shared and the server renders them. On a phone they fold
// into a "Filters" button.
const BrowseFilters = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const active = FIELDS.filter((f) => f !== "sort" && params.get(f)).length
  const [open, setOpen] = useState(false)

  const apply = (form: HTMLFormElement) => {
    const data = new FormData(form)
    const next = new URLSearchParams()
    for (const field of FIELDS) {
      const value = String(data.get(field) ?? "").trim()
      if (value && !(field === "sort" && value === "newest")) {
        next.set(field, value)
      }
    }
    setOpen(false)
    router.push(next.size ? `${pathname}?${next}` : pathname)
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    apply(e.currentTarget)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 small:hidden">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mates-filters"
        >
          {open ? "Hide filters" : active ? `Filters (${active})` : "Filters"}
        </Button>
      </div>

      <form
        id="mates-filters"
        key={params.toString()}
        onSubmit={onSubmit}
        className={`${
          open ? "flex" : "hidden"
        } small:flex flex-col gap-4 rounded-large border border-petzy-border bg-white p-4`}
        data-testid="mates-filters"
      >
        <div className="grid grid-cols-2 small:grid-cols-1 gap-3">
          <label className="flex flex-col gap-1 text-small-regular col-span-2 small:col-span-1">
            Sort by
            <select
              name="sort"
              defaultValue={params.get("sort") ?? "newest"}
              className={inputClass}
              onChange={(e) =>
                e.currentTarget.form && apply(e.currentTarget.form)
              }
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-small-regular">
            Pet type
            <select
              name="pet_type"
              defaultValue={params.get("pet_type") ?? ""}
              className={inputClass}
            >
              <option value="">Any</option>
              {PET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-small-regular">
            Gender
            <select
              name="gender"
              defaultValue={params.get("gender") ?? ""}
              className={inputClass}
            >
              <option value="">Any</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-small-regular">
            Breed
            <input
              name="breed"
              defaultValue={params.get("breed") ?? ""}
              placeholder="e.g. Beagle"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-small-regular">
            City
            <input
              name="city"
              defaultValue={params.get("city") ?? ""}
              placeholder="e.g. Pune"
              className={inputClass}
            />
          </label>
          <fieldset className="col-span-2 small:col-span-1 flex flex-col gap-1 text-small-regular">
            <legend className="mb-1">Price (₹)</legend>
            <div className="flex items-center gap-2">
              <input
                name="min_price"
                type="number"
                min={0}
                inputMode="numeric"
                aria-label="Minimum price"
                placeholder="Min"
                defaultValue={params.get("min_price") ?? ""}
                className={inputClass}
              />
              <span aria-hidden="true">to</span>
              <input
                name="max_price"
                type="number"
                min={0}
                inputMode="numeric"
                aria-label="Maximum price"
                placeholder="Max"
                defaultValue={params.get("max_price") ?? ""}
                className={inputClass}
              />
            </div>
          </fieldset>
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            Show results
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

export default BrowseFilters
