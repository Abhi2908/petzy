import { retrieveCustomer } from "@lib/data/customer"
import {
  getMatesListing,
  listMyMatesListings,
  listMyMatesOffers,
} from "@lib/data/mates"
import {
  formatAge,
  formatDate,
  formatRupees,
  OFFER_STATUS,
  petTypeLabel,
} from "@lib/util/mates-format"
import { Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Gallery from "@modules/mates/components/gallery"
import HealthBadges from "@modules/mates/components/health-badges"
import LoginPrompt from "@modules/mates/components/login-prompt"
import Notice from "@modules/mates/components/notice"
import OfferForm from "@modules/mates/components/offer-form"
import ReportLink from "@modules/mates/components/report-link"

const MatesListingTemplate = async ({ id }: { id: string }) => {
  const [result, customer] = await Promise.all([
    getMatesListing(id),
    retrieveCustomer().catch(() => null),
  ])

  if (result.error !== undefined) {
    return (
      <div className="content-container py-12 max-w-2xl">
        {result.status === 404 ? (
          <Notice
            tone="empty"
            title="This listing is no longer available."
            action={{ href: "/mates", label: "Browse Mates" }}
          >
            It may have been sold, reserved or taken down by the seller.
          </Notice>
        ) : (
          <Notice tone="error" title="We could not load this listing." retry>
            {result.error}
          </Notice>
        )}
      </div>
    )
  }

  const listing = result.data.listing
  // Only needed for signed-in visitors: is it theirs, and do they already have an offer waiting on it?
  const [mine, myOffers] = customer
    ? await Promise.all([
        listMyMatesListings(),
        listMyMatesOffers("open,countered"),
      ])
    : [null, null]
  const isOwn = !!mine?.data?.listings.some((l) => l.id === listing.id)
  const liveOffer = myOffers?.data?.offers.find(
    (o) => o.listing.id === listing.id
  )

  const details = [
    ["Breed", `${listing.breed} (${petTypeLabel(listing.pet_type)})`],
    ["Gender", listing.gender === "male" ? "Male" : "Female"],
    ["Age", formatAge(listing.age_months)],
    ["Colour", listing.color ?? "-"],
    ["Location", `${listing.city}, ${listing.state} ${listing.pincode}`],
    [
      "Seller",
      listing.seller_type === "breeder" ? "Breeder" : "Individual owner",
    ],
    ...(listing.breeder_registration_no
      ? [["Breeder registration", listing.breeder_registration_no]]
      : []),
    ["Posted", formatDate(listing.created_at)],
  ]

  return (
    <div
      className="content-container py-6 small:py-12"
      data-testid="mates-listing"
    >
      <LocalizedClientLink
        href="/mates"
        className="text-small-regular text-ui-fg-subtle hover:text-petzy-coral"
      >
        &larr; All listings
      </LocalizedClientLink>

      {/* Phones read top to bottom: photos, title and offer, then details. Desktop puts the title and
          offer box in a sticky column beside the photos and details. */}
      <div className="mt-4 grid grid-cols-1 small:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-x-8 gap-y-6">
        <div className="min-w-0 small:col-start-1 small:row-start-1">
          <Gallery images={listing.image_urls} title={listing.title} />
        </div>

        <aside className="flex flex-col gap-6 small:col-start-2 small:row-start-1 small:row-span-2 small:sticky small:top-20 small:self-start">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl small:text-3xl font-semibold">
              {listing.title}
            </h1>
            <p className="text-3xl font-semibold text-ui-fg-base">
              {formatRupees(listing.price)}
            </p>
            <p className="text-small-regular text-ui-fg-subtle">
              {listing.price_negotiable
                ? "Negotiable: the seller takes offers"
                : "Firm price"}{" "}
              · {listing.city}
            </p>
          </div>

          <div className="rounded-large border border-petzy-border bg-white p-5 flex flex-col gap-4">
            {isOwn ? (
              <Notice
                tone="info"
                title="This is your listing."
                action={{ href: "/mates/my", label: "Go to My Mates" }}
              >
                Offers from buyers appear in your offers inbox.
              </Notice>
            ) : liveOffer ? (
              <Notice
                tone="info"
                title={`You offered ${formatRupees(liveOffer.amount)}`}
                action={{
                  href: `/mates/my/offers/${liveOffer.id}`,
                  label: "View your offer",
                }}
              >
                {OFFER_STATUS[liveOffer.status].label}.
                {liveOffer.your_turn
                  ? " The seller has answered: it is your turn."
                  : ""}
              </Notice>
            ) : customer ? (
              <>
                <h2 className="text-lg font-semibold">
                  {listing.price_negotiable
                    ? "Make an offer"
                    : `Buy at ${formatRupees(listing.price)}`}
                </h2>
                <OfferForm
                  listingId={listing.id}
                  price={listing.price}
                  firm={!listing.price_negotiable}
                />
              </>
            ) : (
              <LoginPrompt
                title={
                  listing.price_negotiable
                    ? "Sign in to make an offer"
                    : `Sign in to buy at ${formatRupees(listing.price)}`
                }
                bare
              >
                Offers and messages need a Petzy account so the seller knows who
                they are talking to.
              </LoginPrompt>
            )}
          </div>

          {!isOwn && (
            <ReportLink listingId={listing.id} signedIn={!!customer} />
          )}
        </aside>

        <div className="flex flex-col gap-4 min-w-0 small:col-start-1 small:row-start-2">
          <h2 className="text-xl font-semibold">About this pet</h2>
          <HealthBadges
            vaccinated={listing.vaccinated}
            dewormed={listing.dewormed}
            hasPapers={listing.has_papers}
          />
          <dl className="grid grid-cols-1 xsmall:grid-cols-2 gap-x-6 gap-y-3">
            {details.map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-xs text-ui-fg-subtle">{label}</dt>
                <dd className="text-ui-fg-base">{value}</dd>
              </div>
            ))}
          </dl>
          {listing.description && (
            <Text className="whitespace-pre-line text-ui-fg-base">
              {listing.description}
            </Text>
          )}
        </div>
      </div>
    </div>
  )
}

export default MatesListingTemplate
