import { callout, detailsTable, indiaDateTime, paragraph, render, RenderedEmail, rupees } from "./layout"

// Vet appointment emails. The customer's email is optional when booking, so the customer emails are only
// sent when one was given. The clinic gets the customer's phone (it needs it to reach them); the customer
// gets the clinic's phone, as on the booking confirmation page.

export type VetAppointmentView = {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  pet_name: string
  pet_type: string
  reason: string | null
  starts_at: Date | string
  provider: {
    name: string
    clinic_name: string
    city: string
    phone: string | null
    consultation_fee: number
  }
}

export function vetBookedForCustomer(a: VetAppointmentView): RenderedEmail {
  const when = indiaDateTime(a.starts_at)
  const blocks = [
    paragraph(`Hi ${a.customer_name}, your appointment for ${a.pet_name} is booked.`),
    detailsTable([
      ["Vet", a.provider.name],
      ["Clinic", `${a.provider.clinic_name}, ${a.provider.city}`],
      ["Date and time", when],
      ["Pet", `${a.pet_name} (${a.pet_type})`],
    ]),
    callout(`Pay ${rupees(a.provider.consultation_fee)} at the clinic`),
  ]
  if (a.provider.phone) {
    blocks.push(paragraph(`Need to change it? Call the clinic on ${a.provider.phone}.`))
  }
  return render(`Vet appointment booked: ${when}`, "Your vet appointment is booked", blocks)
}

export function vetBookedForProvider(a: VetAppointmentView): RenderedEmail {
  const when = indiaDateTime(a.starts_at)
  return render(
    `New Petzy booking: ${a.pet_name}, ${when}`,
    "New appointment booked through Petzy",
    [
      paragraph(`${a.customer_name} booked an appointment with ${a.provider.name}.`),
      detailsTable([
        ["Date and time", when],
        ["Customer", a.customer_name],
        ["Phone", a.customer_phone],
        ["Email", a.customer_email],
        ["Pet", `${a.pet_name} (${a.pet_type})`],
        ["Reason", a.reason],
        ["Fee (paid at the clinic)", rupees(a.provider.consultation_fee)],
      ]),
    ],
    "You are receiving this email because your clinic takes bookings through Petzy."
  )
}

export function vetCancelledForCustomer(a: VetAppointmentView): RenderedEmail {
  const when = indiaDateTime(a.starts_at)
  const blocks = [
    paragraph(`Hi ${a.customer_name}, your appointment for ${a.pet_name} with ${a.provider.name} on ${when} has been cancelled.`),
    detailsTable([
      ["Clinic", `${a.provider.clinic_name}, ${a.provider.city}`],
      ["Was booked for", when],
    ]),
    paragraph("You can book another time on Petzy whenever you like."),
  ]
  if (a.provider.phone) {
    blocks.push(paragraph(`Questions? Call the clinic on ${a.provider.phone}.`))
  }
  return render(`Vet appointment cancelled: ${when}`, "Your vet appointment was cancelled", blocks)
}

export function vetCancelledForProvider(a: VetAppointmentView): RenderedEmail {
  const when = indiaDateTime(a.starts_at)
  return render(
    `Booking cancelled: ${a.pet_name}, ${when}`,
    "A Petzy booking was cancelled",
    [
      paragraph(`The appointment below has been cancelled and the time is free again.`),
      detailsTable([
        ["Date and time", when],
        ["Customer", a.customer_name],
        ["Phone", a.customer_phone],
        ["Pet", `${a.pet_name} (${a.pet_type})`],
      ]),
    ],
    "You are receiving this email because your clinic takes bookings through Petzy."
  )
}

