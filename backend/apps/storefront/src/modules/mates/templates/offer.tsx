import { retrieveCustomer } from "@lib/data/customer"
import { getMatesOffer, listMatesMessages } from "@lib/data/mates"
import { formatDate, formatRupees, OFFER_STATUS } from "@lib/util/mates-format"
import { Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ListingPhoto from "@modules/mates/components/listing-photo"
import LoginPrompt from "@modules/mates/components/login-prompt"
import MessageThread from "@modules/mates/components/message-thread"
import Notice from "@modules/mates/components/notice"
import OfferActions from "@modules/mates/components/offer-actions"
import WithdrawLink from "@modules/mates/components/withdraw-link"
import StatusPill from "@modules/mates/components/status-pill"

const WAITING: Record<string, string> = {
  open: "Waiting for the seller to answer.",
  countered: "Waiting for the buyer to accept, counter or withdraw.",
}

const MatesOfferTemplate = async ({ id }: { id: string }) => {
  const customer = await retrieveCustomer().catch(() => null)
  if (!customer) {
    return (
      <div className="content-container py-12 max-w-xl">
        <LoginPrompt title="Sign in to see this offer" />
      </div>
    )
  }

  const [result, thread] = await Promise.all([
    getMatesOffer(id),
    listMatesMessages(id),
  ])
  if (result.error !== undefined) {
    return (
      <div className="content-container py-12 max-w-2xl">
        {result.status === 404 ? (
          <Notice
            tone="empty"
            title="We could not find this offer."
            action={{ href: "/mates/my/offers", label: "Back to offers" }}
          />
        ) : (
          <Notice tone="error" title="We could not load this offer." retry>
            {result.error}
          </Notice>
        )}
      </div>
    )
  }

  const offer = result.data.offer
  const { listing } = offer
  const status = OFFER_STATUS[offer.status]
  const live = offer.status === "open" || offer.status === "countered"
  const otherPhone =
    offer.your_side === "seller" ? offer.buyer_phone : offer.seller_phone
  const other = offer.your_side === "seller" ? "buyer" : "seller"

  return (
    <div
      className="content-container py-6 small:py-12 max-w-3xl"
      data-testid="mates-offer"
    >
      <LocalizedClientLink
        href="/mates/my/offers"
        className="text-small-regular text-ui-fg-subtle hover:text-petzy-coral"
      >
        &larr; All offers
      </LocalizedClientLink>

      <div className="mt-4 flex flex-col gap-6">
        <div className="flex gap-4 rounded-large border border-petzy-border bg-white p-4">
          <ListingPhoto
            src={listing.image_urls[0]}
            alt={listing.title}
            sizes="128px"
            className="h-24 w-28 xsmall:w-32 shrink-0 rounded-md"
          />
          <div className="flex flex-col gap-1 min-w-0">
            <Text className="text-xs text-ui-fg-subtle">
              {offer.your_side === "seller"
                ? "Offer on your listing"
                : "Your offer on"}
            </Text>
            {listing.status === "active" ? (
              <LocalizedClientLink
                href={`/mates/${listing.id}`}
                className="font-semibold text-petzy-teal hover:text-petzy-coral"
              >
                {listing.title}
              </LocalizedClientLink>
            ) : (
              <span className="font-semibold">{listing.title}</span>
            )}
            <Text className="text-small-regular text-ui-fg-subtle">
              Asking {formatRupees(listing.price)} · {listing.city}
            </Text>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-3xl font-semibold">
              {formatRupees(offer.amount)}
            </p>
            <Text className="text-small-regular text-ui-fg-subtle">
              Latest amount, from{" "}
              {offer.last_actor === offer.your_side
                ? "you"
                : `the ${offer.last_actor}`}
              , {formatDate(offer.updated_at)}
            </Text>
          </div>
          <StatusPill label={status.label} tone={status.tone} />
        </div>

        {offer.status === "accepted" && otherPhone && (
          <div
            className="rounded-large border-2 border-petzy-teal bg-petzy-teal/5 p-5 flex flex-col gap-1"
            data-testid="mates-contact"
          >
            <Text className="font-semibold text-petzy-teal">
              Offer accepted. Call the {other} to arrange the handover.
            </Text>
            <a
              href={`tel:${otherPhone.replace(/[^\d+]/g, "")}`}
              className="text-2xl font-semibold text-ui-fg-base underline-offset-4 hover:underline"
            >
              {otherPhone}
            </a>
            <Text className="text-xs text-ui-fg-subtle">
              Meet the pet in person and check its papers before paying.
            </Text>
          </div>
        )}

        {offer.your_turn ? (
          <OfferActions
            offerId={offer.id}
            side={offer.your_side}
            amount={offer.amount}
            canCounter={listing.price_negotiable}
          />
        ) : live ? (
          <div className="flex flex-col gap-3">
            <Notice tone="info" title={WAITING[offer.status]}>
              You will see it here as soon as they answer.
            </Notice>
            <WithdrawLink offerId={offer.id} side={offer.your_side} />
          </div>
        ) : offer.status !== "accepted" ? (
          <Notice tone="info" title={`This offer was ${offer.status}.`} />
        ) : null}

        <MessageThread
          offerId={offer.id}
          side={offer.your_side}
          messages={thread.data?.messages ?? null}
          loadError={thread.error}
          canPost={live || offer.status === "accepted"}
        />
      </div>
    </div>
  )
}

export default MatesOfferTemplate
