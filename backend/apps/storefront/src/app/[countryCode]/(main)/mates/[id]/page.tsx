import { Metadata } from "next"

import { getMatesListing } from "@lib/data/mates"
import MatesListingTemplate from "@modules/mates/templates/listing"

export const dynamic = "force-dynamic"

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await props.params
  const result = await getMatesListing(id)
  return result.data
    ? {
        title: result.data.listing.title,
        description: `${result.data.listing.breed} in ${result.data.listing.city}`,
      }
    : { title: "Mates listing" }
}

export default async function MatesListingPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  return <MatesListingTemplate id={id} />
}
