import { Metadata } from "next"

import { listVetProviders } from "@lib/data/vet"
import VetBookingTemplate from "@modules/vet/templates"

export const metadata: Metadata = {
  title: "Book a vet",
  description: "Book a vet appointment near you and pay at the clinic.",
}

// Vets and their availability change with every booking.
export const dynamic = "force-dynamic"

export default async function VetPage() {
  const result = await listVetProviders()

  return (
    <VetBookingTemplate
      providers={result.data ?? null}
      error={result.error ?? null}
    />
  )
}
