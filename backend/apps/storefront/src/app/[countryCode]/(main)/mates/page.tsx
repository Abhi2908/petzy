import { Metadata } from "next"

import MatesBrowseTemplate, {
  BrowseSearchParams,
} from "@modules/mates/templates/browse"

export const metadata: Metadata = {
  title: "Mates: pets for sale",
  description:
    "Find puppies, kittens, birds and fish from owners and breeders near you.",
}

export const dynamic = "force-dynamic"

export default async function MatesPage(props: {
  searchParams: Promise<BrowseSearchParams>
}) {
  return <MatesBrowseTemplate searchParams={await props.searchParams} />
}
