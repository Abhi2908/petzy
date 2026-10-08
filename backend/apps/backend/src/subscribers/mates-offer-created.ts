import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { MATES_MODULE } from "../modules/mates"
import { MATES_EVENTS } from "../modules/mates/events"
import MatesModuleService from "../modules/mates/service"
import { customerEmail, runNotification } from "../notifications/run"
import { sendEmail } from "../notifications/send"
import { storefrontUrl } from "../notifications/settings"
import { offerReceived, TEMPLATES } from "../notifications/templates"

// A new offer emails the seller (no phone numbers).
export default async function matesOfferCreated({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  await runNotification(container, `mates offer ${data.id}`, async () => {
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    const offer = await mates.retrieveMatesOffer(data.id, { relations: ["listing"] })
    await sendEmail(container, {
      group: "mates",
      template: TEMPLATES.MATES_OFFER_RECEIVED,
      to: await customerEmail(container, offer.listing.seller_customer_id),
      email: offerReceived({ listing: offer.listing, offer, link: `${storefrontUrl()}/mates/my/offers/${offer.id}` }),
      resource: { type: "mates_offer", id: offer.id },
      idempotencyKey: `${TEMPLATES.MATES_OFFER_RECEIVED}:${offer.id}`,
    })
  })
}

export const config: SubscriberConfig = { event: MATES_EVENTS.OFFER_CREATED }
