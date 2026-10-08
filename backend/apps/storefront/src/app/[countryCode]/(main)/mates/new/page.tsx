import { Metadata } from "next"

import { retrieveCustomer } from "@lib/data/customer"
import { Text } from "@modules/common/components/ui"
import ListingForm from "@modules/mates/components/listing-form"
import LoginPrompt from "@modules/mates/components/login-prompt"

export const metadata: Metadata = {
  title: "Post a listing",
  description: "List a pet on Petzy Mates.",
}

export const dynamic = "force-dynamic"

export default async function NewMatesListingPage() {
  const customer = await retrieveCustomer().catch(() => null)
  return (
    <div
      className="content-container py-6 small:py-12 max-w-3xl"
      data-testid="mates-new"
    >
      <h1 className="text-3xl font-semibold mb-2">Post a listing</h1>
      <Text className="text-ui-fg-subtle mb-8">
        Tell buyers about the pet. Our team checks every listing before it goes
        live.
      </Text>
      {customer ? (
        <ListingForm />
      ) : (
        <LoginPrompt title="Sign in to post a listing">
          You need a Petzy account so buyers can make you offers.
        </LoginPrompt>
      )}
    </div>
  )
}
