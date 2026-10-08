import { Metadata } from "next"

import { retrieveCustomer } from "@lib/data/customer"
import { listMyMatesListings } from "@lib/data/mates"
import { Text } from "@modules/common/components/ui"
import ListingForm from "@modules/mates/components/listing-form"
import LoginPrompt from "@modules/mates/components/login-prompt"
import Notice from "@modules/mates/components/notice"

export const metadata: Metadata = { title: "Edit listing" }

export const dynamic = "force-dynamic"

const EDITABLE = ["pending_review", "active", "rejected"]

export default async function EditMatesListingPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const customer = await retrieveCustomer().catch(() => null)
  if (!customer) {
    return (
      <div className="content-container py-12 max-w-xl">
        <LoginPrompt title="Sign in to edit your listing" />
      </div>
    )
  }

  // The "my listings" list is the one response that carries the seller's phone, so the form can show it.
  const result = await listMyMatesListings()
  const listing = result.data?.listings.find((l) => l.id === id)

  return (
    <div className="content-container py-6 small:py-12 max-w-3xl">
      <h1 className="text-3xl font-semibold mb-2">Edit listing</h1>
      <Text className="text-ui-fg-subtle mb-8">
        Saving sends it back to our team for a quick check before it shows
        again.
      </Text>
      {result.error !== undefined ? (
        <Notice tone="error" title="We could not load your listing." retry>
          {result.error}
        </Notice>
      ) : !listing ? (
        <Notice
          tone="empty"
          title="We could not find this listing."
          action={{ href: "/mates/my", label: "Back to My Mates" }}
        />
      ) : !EDITABLE.includes(listing.status) ? (
        <Notice
          tone="info"
          title="This listing can no longer be edited."
          action={{ href: "/mates/my", label: "Back to My Mates" }}
        >
          Reserved, sold, expired and removed listings are closed.
        </Notice>
      ) : (
        <ListingForm listing={listing} />
      )}
    </div>
  )
}
