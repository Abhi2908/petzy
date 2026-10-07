import { BookVetAppointmentInput } from "@lib/data/vet"
import Input from "@modules/common/components/input"
import { Button, clx, Label, Text } from "@modules/common/components/ui"
import { FormEvent } from "react"

export const PET_TYPES = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "fish", label: "Fish" },
  { value: "bird", label: "Bird" },
  { value: "other", label: "Other" },
]

export type BookingDetails = Omit<
  BookVetAppointmentInput,
  "provider_id" | "starts_at"
>

type BookingFormProps = {
  slotLabel: string | null
  submitting: boolean
  error: string | null
  onSubmit: (details: BookingDetails) => void
}

const optional = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim()
  return text ? text : null
}

// Uncontrolled on purpose: the details stay filled in when a booking fails and
// the customer only has to pick another time.
const BookingForm = ({
  slotLabel,
  submitting,
  error,
  onSubmit,
}: BookingFormProps) => {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    onSubmit({
      customer_name: String(form.get("customer_name") ?? "").trim(),
      customer_phone: String(form.get("customer_phone") ?? "").trim(),
      customer_email: optional(form.get("customer_email")),
      pet_name: String(form.get("pet_name") ?? "").trim(),
      pet_type: String(form.get("pet_type") ?? ""),
      reason: optional(form.get("reason")),
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      data-testid="vet-booking-form"
    >
      <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-4">
        <Input
          label="Your name"
          name="customer_name"
          autoComplete="name"
          maxLength={120}
          required
        />
        <Input
          label="Phone"
          name="customer_phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          pattern="[+\d][\d\s\-]{6,18}"
          title="Enter a valid phone number"
          required
        />
        <Input
          label="Email (optional)"
          name="customer_email"
          type="email"
          autoComplete="email"
          maxLength={160}
        />
        <Input label="Pet name" name="pet_name" maxLength={80} required />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 txt-compact-medium-plus">
          Pet type<span className="text-rose-500">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {PET_TYPES.map((type, i) => (
            <label key={type.value} className="cursor-pointer">
              <input
                type="radio"
                name="pet_type"
                value={type.value}
                required={i === 0}
                className="peer sr-only"
              />
              <span
                className={clx(
                  "inline-flex h-10 items-center rounded-full border border-petzy-border bg-white px-4 text-small-regular text-petzy-teal transition-colors",
                  "peer-checked:bg-petzy-teal peer-checked:border-petzy-teal peer-checked:text-white",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-petzy-coral"
                )}
              >
                {type.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="vet-reason" className="txt-compact-medium-plus">
          Reason for visit (optional)
        </Label>
        <textarea
          id="vet-reason"
          name="reason"
          rows={3}
          maxLength={500}
          className="block w-full rounded-md border border-ui-border-base bg-ui-bg-field px-4 py-2 txt-compact-medium hover:bg-ui-bg-field-hover focus:outline-none focus:shadow-borders-interactive-with-active"
        />
      </div>

      {error && (
        <div
          className="rounded-rounded border border-rose-200 bg-rose-50 p-4"
          role="alert"
          data-testid="vet-booking-error"
        >
          <Text className="text-rose-700">{error}</Text>
        </div>
      )}

      <div className="flex flex-col xsmall:flex-row xsmall:items-center gap-3">
        <Button
          type="submit"
          size="large"
          className="w-full xsmall:w-auto"
          disabled={!slotLabel}
          isLoading={submitting}
          data-testid="vet-book-button"
        >
          Book appointment
        </Button>
        <Text className="text-ui-fg-subtle text-small-regular">
          {slotLabel ?? "Pick a time above to continue."}
        </Text>
      </div>
    </form>
  )
}

export default BookingForm
