import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { MATES_MODULE } from "../modules/mates"
import { MATES_EVENTS } from "../modules/mates/events"
import MatesModuleService from "../modules/mates/service"
import { customerEmail, runNotification } from "../notifications/run"
import { sendEmail } from "../notifications/send"
import { storefrontUrl } from "../notifications/settings"
import { offerAccepted, offerCountered, offerRejected, TEMPLATES } from "../notifications/templates"

type OfferUpdated = {
  id: string
  action: "accept" | "reject" | "counter" | "withdraw"
  side: "buyer" | "seller"
  closed_offer_ids: string[]
}

// What each offer move sends:
//   seller counters          -> the buyer
//   seller rejects           -> the buyer
//   either side accepts      -> both sides, each with the other's phone number (the only Mates email with one)
//                               plus every other buyer whose live offer the acceptance closed
//   buyer counters, withdrawals, buyer rejects -> nothing
export default async function matesOfferUpdated({ event: { data }, container }: SubscriberArgs<OfferUpdated>) {
  await runNotification(container, `mates offer ${data.action} ${data.id}`, async () => {
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    const offer = await mates.retrieveMatesOffer(data.id, { relations: ["listing"] })
    const listing = offer.listing
    const resource = { type: "mates_offer", id: offer.id }
    const stamp = new Date(offer.updated_at).toISOString()
    const offerLink = `${storefrontUrl()}/mates/my/offers/${offer.id}`
    const buyerEmail = () => customerEmail(container, offer.buyer_customer_id)

    if (data.action === "counter" && data.side === "seller") {
      await sendEmail(container, {
        group: "mates",
        template: TEMPLATES.MATES_OFFER_COUNTERED,
        to: await buyerEmail(),
        email: offerCountered({ listing, offer, link: offerLink }),
        resource,
        idempotencyKey: `${TEMPLATES.MATES_OFFER_COUNTERED}:${offer.id}:${stamp}`,
      })
    }

    if (data.action === "reject" && data.side === "seller") {
      await sendEmail(container, {
        group: "mates",
        template: TEMPLATES.MATES_OFFER_REJECTED,
        to: await buyerEmail(),
        email: offerRejected({ listing, offer, link: `${storefrontUrl()}/mates`, why: "seller" }),
        resource,
        idempotencyKey: `${TEMPLATES.MATES_OFFER_REJECTED}:${offer.id}`,
      })
    }

    if (data.action === "accept") {
      for (const to of ["buyer", "seller"] as const) {
        await sendEmail(container, {
          group: "mates",
          template: TEMPLATES.MATES_OFFER_ACCEPTED,
          to: to === "buyer" ? await buyerEmail() : await customerEmail(container, listing.seller_customer_id),
          email: offerAccepted({ listing, offer, to, link: offerLink }),
          resource,
          idempotencyKey: `${TEMPLATES.MATES_OFFER_ACCEPTED}:${offer.id}:${to}`,
        })
      }
      const closed = data.closed_offer_ids?.length ? await mates.listMatesOffers({ id: data.closed_offer_ids }) : []
      for (const other of closed) {
        await sendEmail(container, {
          group: "mates",
          template: TEMPLATES.MATES_OFFER_REJECTED,
          to: await customerEmail(container, other.buyer_customer_id),
          email: offerRejected({ listing, offer: other, link: `${storefrontUrl()}/mates`, why: "another_offer" }),
          resource: { type: "mates_offer", id: other.id },
          idempotencyKey: `${TEMPLATES.MATES_OFFER_REJECTED}:${other.id}`,
        })
      }
    }
  })
}

export const config: SubscriberConfig = { event: MATES_EVENTS.OFFER_UPDATED }
