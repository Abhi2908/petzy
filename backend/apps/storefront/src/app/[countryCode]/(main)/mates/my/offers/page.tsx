import { Metadata } from "next"

import MyOffersTemplate from "@modules/mates/templates/my-offers"

export const metadata: Metadata = {
  title: "Mates offers",
  description: "Offers you made and offers on your listings.",
}

export const dynamic = "force-dynamic"

export default function MyMatesOffersPage() {
  return <MyOffersTemplate />
}
