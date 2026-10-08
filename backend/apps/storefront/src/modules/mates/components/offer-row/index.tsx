import { MatesOffer } from "@lib/data/mates"
import { formatDate, formatRupees, OFFER_STATUS } from "@lib/util/mates-format"
import { Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ListingPhoto from "../listing-photo"
import StatusPill from "../status-pill"

// One line in the offers inbox. The whole row opens the offer.
const OfferRow = ({ offer }: { offer: MatesOffer }) => {
  const status = OFFER_STATUS[offer.status]
  const phone =
    offer.your_side === "seller" ? offer.buyer_phone : offer.seller_phone
  return (
    <LocalizedClientLink
      href={`/mates/my/offers/${offer.id}`}
      className="flex gap-3 rounded-large border border-petzy-border bg-white p-3 hover:border-petzy-coral focus:outline-none focus-visible:ring-2 focus-visible:ring-petzy-teal"
      data-testid="mates-offer-row"
    >
      <ListingPhoto
        src={offer.listing.image_urls[0]}
        alt=""
        sizes="96px"
        className="h-20 w-24 shrink-0 rounded-md"
      />
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-ui-fg-base truncate">
            {offer.listing.title}
          </span>
          <div className="flex gap-1">
            {offer.your_turn && (
              <StatusPill
                label="Your turn"
                tone="coral"
                className="!bg-petzy-coral !text-[#1A1A1A]"
              />
            )}
            <StatusPill label={status.label} tone={status.tone} />
          </div>
        </div>
        <Text className="text-small-regular text-ui-fg-subtle">
          {formatRupees(offer.amount)} (asking{" "}
          {formatRupees(offer.listing.price)}) ·{" "}
          {offer.last_actor === offer.your_side
            ? "your last move"
            : `${offer.last_actor}'s last move`}{" "}
          · {formatDate(offer.updated_at)}
        </Text>
        {offer.status === "accepted" && phone && (
          <Text className="text-small-regular text-petzy-teal font-semibold">
            {offer.your_side === "seller" ? "Buyer" : "Seller"}: {phone}
          </Text>
        )}
      </div>
    </LocalizedClientLink>
  )
}

export default OfferRow
