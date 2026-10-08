import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { MATES_MODULE } from "../modules/mates"
import { MATES_EVENTS } from "../modules/mates/events"
import MatesModuleService from "../modules/mates/service"
import { customerEmail, runNotification } from "../notifications/run"
import { sendEmail } from "../notifications/send"
import { storefrontUrl } from "../notifications/settings"
import { listingApproved, listingRejected, TEMPLATES } from "../notifications/templates"

// Admin approving or rejecting a listing emails the seller (rejections include the reason).
// Removal sends nothing.
export default async function matesListingModerated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; action: "approve" | "reject" | "remove" }>) {
  if (data.action === "remove") {
    return
  }
  await runNotification(container, `mates listing ${data.action} ${data.id}`, async () => {
    const mates: MatesModuleService = container.resolve(MATES_MODULE)
    const listing = await mates.retrieveMatesListing(data.id)
    const approved = data.action === "approve"
    const template = approved ? TEMPLATES.MATES_LISTING_APPROVED : TEMPLATES.MATES_LISTING_REJECTED
    await sendEmail(container, {
      group: "mates",
      template,
      to: await customerEmail(container, listing.seller_customer_id),
      email: approved
        ? listingApproved({ listing, link: `${storefrontUrl()}/mates/${listing.id}` })
        : listingRejected({ listing, reason: listing.rejection_reason, link: `${storefrontUrl()}/mates/my` }),
      resource: { type: "mates_listing", id: listing.id },
      idempotencyKey: `${template}:${listing.id}:${new Date(listing.updated_at).toISOString()}`,
    })
  })
}

export const config: SubscriberConfig = { event: MATES_EVENTS.LISTING_MODERATED }
