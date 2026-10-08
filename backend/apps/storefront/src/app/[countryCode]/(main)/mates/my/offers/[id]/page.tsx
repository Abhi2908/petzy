import { Metadata } from "next"

import MatesOfferTemplate from "@modules/mates/templates/offer"

export const metadata: Metadata = { title: "Mates offer" }

export const dynamic = "force-dynamic"

export default async function MatesOfferPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  return <MatesOfferTemplate id={id} />
}
