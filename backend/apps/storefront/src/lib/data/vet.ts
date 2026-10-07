"use server"

import { sdk } from "@lib/config"

export type VetProvider = {
  id: string
  name: string
  clinic_name: string
  city: string
  phone: string | null
  specialties: string | null
  consultation_fee: number
  slot_minutes: number
}

export type VetSlot = { starts_at: string; ends_at: string }

export type VetAppointment = {
  id: string
  status: string
  starts_at: string
  ends_at: string
  pet_name: string
  pet_type: string
  provider: Pick<
    VetProvider,
    "id" | "name" | "clinic_name" | "city" | "phone" | "consultation_fee"
  >
  payment: string
}

export type BookVetAppointmentInput = {
  provider_id: string
  starts_at: string
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  pet_name: string
  pet_type: string
  reason?: string | null
}

// Results are returned rather than thrown: Next.js hides the message of an
// error thrown from a server action in production, and the API messages
// ("That time was just booked by someone else") are meant for the customer.
type Result<T> = { data: T; error?: never } | { data?: never; error: string }

const errorMessage = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : "Something went wrong. Please try again."

// Availability changes with every booking, so none of these are cached.
export const listVetProviders = async (): Promise<Result<VetProvider[]>> => {
  try {
    const { providers } = await sdk.client.fetch<{
      providers: VetProvider[]
    }>("/store/vet/providers", { cache: "no-store" })
    return { data: providers }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export const listVetSlots = async (
  providerId: string,
  date: string
): Promise<Result<VetSlot[]>> => {
  try {
    const { slots } = await sdk.client.fetch<{ slots: VetSlot[] }>(
      `/store/vet/providers/${providerId}/slots`,
      { query: { date }, cache: "no-store" }
    )
    return { data: slots }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

export const bookVetAppointment = async (
  input: BookVetAppointmentInput
): Promise<Result<VetAppointment>> => {
  try {
    const { appointment } = await sdk.client.fetch<{
      appointment: VetAppointment
    }>("/store/vet/appointments", {
      method: "POST",
      body: input,
      cache: "no-store",
    })
    return { data: appointment }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}
