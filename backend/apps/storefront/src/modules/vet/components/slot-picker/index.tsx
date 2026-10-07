import { VetSlot } from "@lib/data/vet"
import { addDays, formatClinicDate, formatClinicTime } from "@lib/util/vet-format"
import { Button, clx, Text } from "@modules/common/components/ui"

export type SlotsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; slots: VetSlot[] }

type SlotPickerProps = {
  date: string
  minDate: string
  maxDate: string
  onDateChange: (date: string) => void
  slots: SlotsState
  selected: VetSlot | null
  onSelect: (slot: VetSlot) => void
  onRetry: () => void
}

const SlotPicker = ({
  date,
  minDate,
  maxDate,
  onDateChange,
  slots,
  selected,
  onSelect,
  onRetry,
}: SlotPickerProps) => {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 w-full max-w-md">
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          disabled={date <= minDate}
          onClick={() => onDateChange(addDays(date, -1))}
          aria-label="Previous day"
        >
          &larr;
        </Button>
        <input
          type="date"
          value={date}
          min={minDate}
          max={maxDate}
          required
          onChange={(e) => {
            const value = e.target.value
            if (value && value >= minDate && value <= maxDate) {
              onDateChange(value)
            }
          }}
          aria-label="Appointment date"
          className="h-10 flex-1 min-w-0 rounded-md border border-ui-border-base bg-white px-3 text-base-regular focus:outline-none focus:ring-2 focus:ring-petzy-teal"
          data-testid="vet-date-input"
        />
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          disabled={date >= maxDate}
          onClick={() => onDateChange(addDays(date, 1))}
          aria-label="Next day"
        >
          &rarr;
        </Button>
      </div>

      <Text className="text-ui-fg-subtle text-small-regular">
        {formatClinicDate(date)}. Times are India time (IST).
      </Text>

      {slots.status === "loading" && (
        <div
          className="grid grid-cols-3 xsmall:grid-cols-4 small:grid-cols-6 gap-2"
          aria-busy="true"
          aria-label="Loading open times"
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-md bg-ui-bg-subtle animate-pulse"
            />
          ))}
        </div>
      )}

      {slots.status === "error" && (
        <div
          className="rounded-rounded border border-rose-200 bg-rose-50 p-4 flex flex-col gap-3 items-start"
          role="alert"
        >
          <Text className="text-rose-700">{slots.message}</Text>
          <Button type="button" variant="secondary" size="small" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}

      {slots.status === "ready" && slots.slots.length === 0 && (
        <div
          className="rounded-rounded border border-dashed border-petzy-border p-6 text-center"
          data-testid="vet-no-slots"
        >
          <Text className="text-ui-fg-base">
            No open times on {formatClinicDate(date)}.
          </Text>
          <Text className="text-ui-fg-subtle text-small-regular">
            Please try another day.
          </Text>
        </div>
      )}

      {slots.status === "ready" && slots.slots.length > 0 && (
        <ul className="grid grid-cols-3 xsmall:grid-cols-4 small:grid-cols-6 gap-2">
          {slots.slots.map((slot) => {
            const isSelected = selected?.starts_at === slot.starts_at
            return (
              <li key={slot.starts_at}>
                <button
                  type="button"
                  onClick={() => onSelect(slot)}
                  aria-pressed={isSelected}
                  className={clx(
                    "w-full h-10 rounded-md border text-small-regular transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-petzy-teal",
                    isSelected
                      ? "bg-petzy-coral border-petzy-coral text-[#1A1A1A] font-semibold"
                      : "bg-white border-petzy-border text-petzy-teal hover:border-petzy-coral"
                  )}
                  data-testid="vet-slot-button"
                >
                  {formatClinicTime(slot.starts_at)}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default SlotPicker
