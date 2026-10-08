import { listMatesListings } from "@lib/data/mates"
import { LISTINGS_PER_PAGE } from "@lib/util/mates-format"
import { Button, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import BrowseFilters from "@modules/mates/components/browse-filters"
import ListingCard from "@modules/mates/components/listing-card"
import Notice from "@modules/mates/components/notice"
import { Pagination } from "@modules/store/components/pagination"

const FILTERS = [
  "pet_type",
  "breed",
  "city",
  "min_price",
  "max_price",
  "gender",
  "sort",
]

export type BrowseSearchParams = Record<string, string | string[] | undefined>

const MatesBrowseTemplate = async ({
  searchParams,
}: {
  searchParams: BrowseSearchParams
}) => {
  const page = Math.max(1, Number(searchParams.page) || 1)
  const query: Record<string, string> = {
    limit: String(LISTINGS_PER_PAGE),
    offset: String((page - 1) * LISTINGS_PER_PAGE),
  }
  for (const key of FILTERS) {
    const value = searchParams[key]
    if (typeof value === "string" && value) {
      query[key] = value
    }
  }
  const filtered = FILTERS.some((k) => k !== "sort" && query[k])
  const result = await listMatesListings(query)

  return (
    <div
      className="content-container py-6 small:py-12"
      data-testid="mates-browse"
    >
      <div className="mb-8 flex flex-col small:flex-row small:items-end small:justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl small:text-4xl font-semibold mb-2">Mates</h1>
          <Text className="text-ui-fg-subtle">
            Puppies, kittens, birds and fish from owners and breeders near you.
            Every listing is checked by our team before it goes live.
          </Text>
        </div>
        <div className="flex gap-2">
          <LocalizedClientLink href="/mates/my">
            <Button variant="secondary">My Mates</Button>
          </LocalizedClientLink>
          <LocalizedClientLink href="/mates/new">
            <Button>Post a listing</Button>
          </LocalizedClientLink>
        </div>
      </div>

      <div className="flex flex-col small:flex-row small:items-start gap-6">
        <aside className="small:w-64 small:shrink-0 small:sticky small:top-20">
          <BrowseFilters />
        </aside>

        <section className="flex-1 min-w-0" aria-label="Listings">
          {result.error !== undefined ? (
            <Notice tone="error" title="We could not load the listings." retry>
              {result.error}
            </Notice>
          ) : result.data.listings.length === 0 ? (
            <Notice
              tone="empty"
              title={
                filtered
                  ? "No listings match these filters."
                  : "No listings yet."
              }
              action={
                filtered
                  ? { href: "/mates", label: "Clear filters" }
                  : { href: "/mates/new", label: "Post the first one" }
              }
            >
              {filtered
                ? "Try a wider price range or another city."
                : "Be the first to list a pet."}
            </Notice>
          ) : (
            <>
              <Text className="mb-4 text-small-regular text-ui-fg-subtle">
                {result.data.count}{" "}
                {result.data.count === 1 ? "listing" : "listings"}
              </Text>
              <ul className="grid grid-cols-1 xsmall:grid-cols-2 medium:grid-cols-3 gap-4">
                {result.data.listings.map((listing) => (
                  <li key={listing.id}>
                    <ListingCard listing={listing} />
                  </li>
                ))}
              </ul>
              {result.data.count > LISTINGS_PER_PAGE && (
                <Pagination
                  page={page}
                  totalPages={Math.ceil(result.data.count / LISTINGS_PER_PAGE)}
                />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default MatesBrowseTemplate
