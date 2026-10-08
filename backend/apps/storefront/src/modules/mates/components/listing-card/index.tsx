import { MatesListing } from "@lib/data/mates"
import { formatAge, formatRupees, petTypeLabel } from "@lib/util/mates-format"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ListingPhoto from "../listing-photo"

const ListingCard = ({ listing }: { listing: MatesListing }) => (
  <LocalizedClientLink
    href={`/mates/${listing.id}`}
    className="group flex flex-col overflow-hidden rounded-large border border-petzy-border bg-white transition-shadow hover:shadow-elevation-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-petzy-teal"
    data-testid="mates-listing-card"
  >
    <ListingPhoto
      src={listing.image_urls[0]}
      alt={listing.title}
      sizes="(max-width: 512px) 100vw, (max-width: 1280px) 50vw, 25vw"
      className="aspect-[4/3]"
    />
    <div className="flex flex-1 flex-col gap-1 p-4">
      <h3 className="text-base font-semibold leading-6 line-clamp-2 group-hover:text-petzy-coral">
        {listing.title}
      </h3>
      <p className="text-small-regular text-ui-fg-subtle">
        {listing.breed} ({petTypeLabel(listing.pet_type)}),{" "}
        {formatAge(listing.age_months)}
      </p>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <div>
          <p className="text-lg font-semibold text-ui-fg-base">
            {formatRupees(listing.price)}
          </p>
          <p className="text-xs text-ui-fg-subtle">
            {listing.price_negotiable ? "Negotiable" : "Firm"}
          </p>
        </div>
        <p className="text-small-regular text-ui-fg-subtle text-right">
          {listing.city}
        </p>
      </div>
    </div>
  </LocalizedClientLink>
)

export default ListingCard
