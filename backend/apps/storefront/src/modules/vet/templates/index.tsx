"use client"

import {
  bookVetAppointment,
  listVetSlots,
  VetAppointment,
  VetProvider,
  VetSlot,
} from "@lib/data/vet"
import {
  addDays,
  clinicDateOf,
  formatClinicDate,
  formatClinicTime,
  MAX_BOOKING_DAYS_AHEAD,
} from "@lib/util/vet-format"
import { Button, Text } from "@modules/common/components/ui"
import BookingConfirmation from "@modules/vet/components/booking-confirmation"
import BookingForm, {
  BookingDetails,
} from "@modules/vet/components/booking-form"
import ProviderList from "@modules/vet/components/provider-list"
import SlotPicker, { SlotsState } from "@modules/vet/components/slot-picker"
import { useRouter } from "next/navigation"
import { ReactNode, useCallback, useEffect, useRef, useState } from "react"

type VetBookingTemplateProps = {
  providers: VetProvider[] | null
  error: string | null
}

const Step = ({
  number,
  title,
  children,
  sectionRef,
}: {
  number: number
  title: string
  children: ReactNode
  sectionRef?: React.Ref<HTMLElement>
}) => (
  <section ref={sectionRef} className="flex flex-col gap-4 scroll-mt-20">
    <h2 className="text-xl font-semibold flex items-center gap-3">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-petzy-teal text-white text-base">
        {number}
      </span>
      {title}
    </h2>
    {children}
  </section>
)

const VetBookingTemplate = ({ providers, error }: VetBookingTemplateProps) => {
  const router = useRouter()
  const [today] = useState(() => clinicDateOf(new Date()))
  const lastDay = addDays(today, MAX_BOOKING_DAYS_AHEAD)

  const [provider, setProvider] = useState<VetProvider | null>(null)
  const [date, setDate] = useState(today)
  const [slots, setSlots] = useState<SlotsState>({ status: "loading" })
  const [slot, setSlot] = useState<VetSlot | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [appointment, setAppointment] = useState<VetAppointment | null>(null)

  const slotsRef = useRef<HTMLElement>(null)
  const detailsRef = useRef<HTMLElement>(null)
  // Ignores slot responses that arrive after the vet or date has changed.
  const latestRequest = useRef(0)

  const loadSlots = useCallback(async (providerId: string, day: string) => {
    const request = ++latestRequest.current
    setSlots({ status: "loading" })
    const result = await listVetSlots(providerId, day)
    if (request !== latestRequest.current) {
      return
    }
    setSlots(
      result.error !== undefined
        ? { status: "error", message: result.error }
        : { status: "ready", slots: result.data }
    )
  }, [])

  useEffect(() => {
    if (provider) {
      setSlot(null)
      loadSlots(provider.id, date)
    }
  }, [provider, date, loadSlots])

  const selectProvider = (next: VetProvider) => {
    setBookingError(null)
    setProvider(next)
    requestAnimationFrame(() =>
      slotsRef.current?.scrollIntoView({ behavior: "smooth" })
    )
  }

  const selectSlot = (next: VetSlot) => {
    setBookingError(null)
    setSlot(next)
    detailsRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const submit = async (details: BookingDetails) => {
    if (!provider || !slot) {
      return
    }
    setSubmitting(true)
    setBookingError(null)
    const result = await bookVetAppointment({
      ...details,
      provider_id: provider.id,
      starts_at: slot.starts_at,
    })
    setSubmitting(false)

    if (result.error !== undefined) {
      // The slot is probably gone: show the reason and the times still open.
      setBookingError(result.error)
      setSlot(null)
      loadSlots(provider.id, date)
      return
    }
    setAppointment(result.data)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const reset = () => {
    setAppointment(null)
    setProvider(null)
    setSlot(null)
    setBookingError(null)
    setDate(clinicDateOf(new Date()))
  }

  return (
    <div className="content-container py-6 small:py-12" data-testid="vet-page">
      <div className="mb-8 small:mb-12 max-w-2xl">
        <h1 className="text-3xl small:text-4xl font-semibold mb-2">
          Book a vet
        </h1>
        <Text className="text-ui-fg-subtle">
          Choose a vet, pick a time that suits you and pay at the clinic. No
          account needed.
        </Text>
      </div>

      {appointment ? (
        <BookingConfirmation appointment={appointment} onBookAnother={reset} />
      ) : error !== null ? (
        <div
          className="rounded-rounded border border-rose-200 bg-rose-50 p-6 flex flex-col gap-3 items-start"
          role="alert"
        >
          <Text className="text-rose-700">
            We could not load the vets right now. {error}
          </Text>
          <Button variant="secondary" onClick={() => router.refresh()}>
            Try again
          </Button>
        </div>
      ) : !providers?.length ? (
        <div className="rounded-rounded border border-dashed border-petzy-border p-8 text-center">
          <Text className="text-ui-fg-base">
            No vets are taking bookings right now.
          </Text>
          <Text className="text-ui-fg-subtle text-small-regular">
            Please check back soon.
          </Text>
        </div>
      ) : (
        <div className="flex flex-col gap-10 small:gap-12">
          <Step number={1} title="Choose a vet">
            <ProviderList
              providers={providers}
              selectedId={provider?.id ?? null}
              onSelect={selectProvider}
            />
          </Step>

          {provider && (
            <Step number={2} title="Pick a date and time" sectionRef={slotsRef}>
              <SlotPicker
                date={date}
                minDate={today}
                maxDate={lastDay}
                onDateChange={setDate}
                slots={slots}
                selected={slot}
                onSelect={selectSlot}
                onRetry={() => loadSlots(provider.id, date)}
              />
            </Step>
          )}

          {provider && (
            <Step number={3} title="Your details" sectionRef={detailsRef}>
              <div className="max-w-2xl">
                <BookingForm
                  slotLabel={
                    slot
                      ? `${provider.name}, ${formatClinicDate(date)} at ${formatClinicTime(slot.starts_at)} IST`
                      : null
                  }
                  submitting={submitting}
                  error={bookingError}
                  onSubmit={submit}
                />
              </div>
            </Step>
          )}
        </div>
      )}
    </div>
  )
}

export default VetBookingTemplate
