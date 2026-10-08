// Events the vet workflows emit after they succeed. Subscribers (notifications) listen to these.
export const VET_EVENTS = {
  APPOINTMENT_BOOKED: "vet.appointment.booked", // { id }
  APPOINTMENT_UPDATED: "vet.appointment.updated", // { id, previous_status }
} as const
