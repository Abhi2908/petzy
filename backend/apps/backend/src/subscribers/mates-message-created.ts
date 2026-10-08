import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { MATES_MODULE } from "../modules/mates"
import { MATES_EVENTS } from "../modules/mates/events"
import MatesModuleService from "../modules/mates/service"
import { customerEmail, runNotification } from "../notifications/run"
import { sendEmail } from "../notifications/send"
import { storefrontUrl } from "../notifications/settings"
import { messageReceived, TEMPLATES } from "../notifications/templates"

// A buyer's message emails the seller, with a short preview in which phone numbers are hidden.
// The seller's own messages send nothing.
export default async function matesMessageCreated({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  await runNotification(container, `mates message ${data.id}`, async () => {
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    const message = await mates.retrieveMatesMessage(data.id, { relations: ["offer", "offer.listing"] })
    if (message.sender !== "buyer") {
      return
    }
    const { offer } = message
    await sendEmail(container, {
      group: "mates",
      template: TEMPLATES.MATES_MESSAGE_RECEIVED,
      to: await customerEmail(container, offer.listing.seller_customer_id),
      email: messageReceived({ listing: offer.listing, body: message.body, link: `${storefrontUrl()}/mates/my/offers/${offer.id}` }),
      resource: { type: "mates_message", id: message.id },
      idempotencyKey: `${TEMPLATES.MATES_MESSAGE_RECEIVED}:${message.id}`,
    })
  })
}

export const config: SubscriberConfig = { event: MATES_EVENTS.MESSAGE_CREATED }
