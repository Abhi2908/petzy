import { clx } from "@modules/common/components/ui"

// Vaccinated / Dewormed / Papers, shown whether or not they apply so buyers can see what is missing.
const HealthBadges = ({
  vaccinated,
  dewormed,
  hasPapers,
}: {
  vaccinated: boolean
  dewormed: boolean
  hasPapers: boolean
}) => {
  const items = [
    { on: vaccinated, yes: "Vaccinated", no: "Not vaccinated" },
    { on: dewormed, yes: "Dewormed", no: "Not dewormed" },
    { on: hasPapers, yes: "Papers", no: "No papers" },
  ]
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Health and papers">
      {items.map((item) => (
        <li
          key={item.yes}
          className={clx(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-small-regular",
            item.on
              ? "border-petzy-teal bg-petzy-teal text-white"
              : "border-petzy-border bg-white text-ui-fg-muted line-through decoration-1"
          )}
        >
          {item.on && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M7.6 14.2 3.4 10l1.4-1.4 2.8 2.8 7.6-7.6L16.6 5z" />
            </svg>
          )}
          {item.on ? item.yes : item.no}
        </li>
      ))}
    </ul>
  )
}

export default HealthBadges
