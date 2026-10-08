import { Metadata } from "next"

import MyListingsTemplate from "@modules/mates/templates/my-listings"

export const metadata: Metadata = {
  title: "My Mates",
  description: "Your Mates listings.",
}

export const dynamic = "force-dynamic"

export default function MyMatesPage() {
  return <MyListingsTemplate />
}
