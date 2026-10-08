import { retrieveCustomer } from "@lib/data/customer"
import {
  listMyMatesListings,
  listMyMatesOffers,
  listReceivedMatesOffers,
} from "@lib/data/mates"
import {
  formatDate,
  formatRupees,
  LISTING_STATUS,
} from "@lib/util/mates-format"
import { Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ListingPhoto from "@modules/mates/components/listing-photo"
import LoginPrompt from "@modules/mates/components/login-prompt"
import MyListingActions from "@modules/mates/components/my-listing-actions"
import MyMatesNav from "@modules/mates/components/my-mates-nav"
import Notice from "@modules/mates/components/notice"
import StatusPill from "@modules/mates/components/status-pill"

const STATUS_HELP: Record<string, string> = {
  pending_review: "Our team is checking it. It goes live once approved.",
  reserved:
    "You accepted an offer. Mark it sold when the pet goes home, or put it back on sale.",
  sold: "Marked as sold.",
  expired:
    "Listings stay up for 60 days. Post it again if the pet is still available.",
  removed: "Taken down by our team.",
}

/** How many offers are waiting for this customer to answer, for the tab label. */
export async function countWaiting() {
  const [made, received] = await Promise.all([
    listMyMatesOffers("open,countered"),
    listReceivedMatesOffers(),
  ])
  return [
    ...(made.data?.offers ?? []),
    ...(received.data?.offers ?? []),
  ].filter((o) => o.your_turn).length
}

const MyListingsTemplate = async () => {
  const customer = await retrieveCustomer().catch(() => null)
  if (!customer) {
    return (
      <div className="content-container py-12 max-w-xl">
        <LoginPrompt title="Sign in to see My Mates">
          Your listings and offers are kept with your Petzy account.
        </LoginPrompt>
      </div>
    )
  }

  const [result, waiting] = await Promise.all([
    listMyMatesListings(),
    countWaiting(),
  ])

  return (
    <div
      className="content-container py-6 small:py-12"
      data-testid="mates-my-listings"
    >
      <MyMatesNav active="listings" waiting={waiting} />
      {result.error !== undefined ? (
        <Notice tone="error" title="We could not load your listings." retry>
          {result.error}
        </Notice>
      ) : result.data.listings.length === 0 ? (
        <Notice
          tone="empty"
          title="You have not posted a listing yet."
          action={{ href: "/mates/new", label: "Post a listing" }}
        >
          It takes a few minutes. Our team checks it before it goes live.
        </Notice>
      ) : (
        <ul className="flex flex-col gap-4">
          {result.data.listings.map((l) => {
            const status = LISTING_STATUS[l.status]
            return (
              <li
                key={l.id}
                className="flex flex-col xsmall:flex-row gap-4 rounded-large border border-petzy-border bg-white p-4"
                data-testid="mates-my-listing"
              >
                <ListingPhoto
                  src={l.image_urls[0]}
                  alt={l.title}
                  sizes="160px"
                  className="aspect-[4/3] w-full xsmall:w-40 shrink-0 rounded-md"
                />
                <div className="flex flex-1 flex-col gap-2 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    {l.status === "active" ? (
                      <LocalizedClientLink
                        href={`/mates/${l.id}`}
                        className="font-semibold text-petzy-teal hover:text-petzy-coral"
                      >
                        {l.title}
                      </LocalizedClientLink>
                    ) : (
                      <h3 className="font-semibold">{l.title}</h3>
                    )}
                    <StatusPill label={status.label} tone={status.tone} />
                  </div>
                  <Text className="text-small-regular text-ui-fg-subtle">
                    {formatRupees(l.price)}{" "}
                    {l.price_negotiable ? "(negotiable)" : "(firm)"} · {l.city}{" "}
                    · Phone on listing: {l.seller_phone ?? "-"}
                  </Text>
                  {l.status === "rejected" && (
                    <div className="rounded-rounded border border-rose-200 bg-rose-50 p-3">
                      <Text className="text-small-regular text-rose-700">
                        Not approved: {l.rejection_reason ?? "no reason given"}.
                        Fix it and resubmit.
                      </Text>
                    </div>
                  )}
                  {l.status === "active" && l.expires_at && (
                    <Text className="text-small-regular text-ui-fg-subtle">
                      Live until {formatDate(l.expires_at)}.
                    </Text>
                  )}
                  {STATUS_HELP[l.status] && (
                    <Text className="text-small-regular text-ui-fg-subtle">
                      {STATUS_HELP[l.status]}
                    </Text>
                  )}
                  <div className="mt-auto pt-1">
                    <MyListingActions id={l.id} status={l.status} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default MyListingsTemplate
