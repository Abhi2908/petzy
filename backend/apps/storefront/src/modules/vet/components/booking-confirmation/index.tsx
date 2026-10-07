import { VetAppointment } from "@lib/data/vet"
import {
  clinicDateOf,
  formatClinicDate,
  formatClinicTime,
  formatFee,
} from "@lib/util/vet-format"
import { Button, Text } from "@modules/common/components/ui"
import { PET_TYPES } from "../booking-form"

type BookingConfirmationProps = {
  appointment: VetAppointment
  onBookAnother: () => void
}

const BookingConfirmation = ({
  appointment,
  onBookAnother,
}: BookingConfirmationProps) => {
  const { provider } = appointment
  const petType =
    PET_TYPES.find((t) => t.value === appointment.pet_type)?.label ??
    appointment.pet_type

  const rows = [
    ["Vet", provider.name],
    ["Clinic", `${provider.clinic_name}, ${provider.city}`],
    [
      "Date and time",
      `${formatClinicDate(clinicDateOf(new Date(appointment.starts_at)))}, ${formatClinicTime(appointment.starts_at)} IST`,
    ],
    ["Pet", `${appointment.pet_name} (${petType})`],
  ]

  return (
    <div
      className="mx-auto max-w-xl bg-white rounded-large border border-petzy-border p-6 small:p-8 flex flex-col gap-6"
      role="status"
      data-testid="vet-booking-confirmation"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold">Appointment booked</h2>
        <Text className="text-ui-fg-subtle">
          The clinic has your booking. Please arrive a few minutes early.
        </Text>
      </div>

      <dl className="flex flex-col divide-y divide-petzy-border">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="py-3 flex flex-col xsmall:flex-row xsmall:justify-between gap-1"
          >
            <dt className="text-ui-fg-subtle text-small-regular">{label}</dt>
            <dd className="text-ui-fg-base xsmall:text-right">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="rounded-rounded bg-petzy-canvas border border-petzy-border p-4 text-center">
        <Text className="font-semibold text-petzy-teal">
          Pay {formatFee(provider.consultation_fee)} at the clinic
        </Text>
        {provider.phone && (
          <Text className="text-ui-fg-subtle text-small-regular">
            Need to change it? Call the clinic on {provider.phone}.
          </Text>
        )}
      </div>

      <Button variant="secondary" onClick={onBookAnother}>
        Book another appointment
      </Button>
    </div>
  )
}

export default BookingConfirmation
