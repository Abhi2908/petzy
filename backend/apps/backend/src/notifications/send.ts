import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { isGroupEnabled, NotificationGroup } from "./settings"
import { RenderedEmail } from "./templates/layout"

// Channels the notification module sends on. Email is the only one today.
//
// SMS later: add a provider module whose options say `channels: ["sms"]` to the notification module in
// medusa-config.ts (next to the email provider), give templates a short `sms` text, and add a sendSms()
// here that mirrors sendEmail() with channel "sms" and a phone number as `to`. Subscribers then call it
// alongside sendEmail(); nothing else needs to change.
export const EMAIL_CHANNEL = "email"

export type EmailRequest = {
  group: NotificationGroup
  /** Template name, stored on the notification record, for example "mates.offer.received". */
  template: string
  to: string | null | undefined
  email: RenderedEmail
  /** What the email is about. Stored on the notification record; keep it to ids, never phone numbers. */
  resource: { type: string; id: string }
  /** Makes a re-delivered event send at most one email per recipient and purpose. */
  idempotencyKey: string
}

/**
 * Sends one email through Medusa's notification module, and never throws: a failed or skipped send is
 * logged, and the booking, offer or order that caused it carries on. Returns true when it was handed to
 * the provider.
 */
export async function sendEmail(container: MedusaContainer, request: EmailRequest): Promise<boolean> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const label = `${request.template} for ${request.resource.type} ${request.resource.id}`
  try {
    if (!isGroupEnabled(request.group)) {
      logger.debug?.(`Notification skipped (${request.group} notifications are switched off): ${label}`)
      return false
    }
    const to = request.to?.trim()
    if (!to) {
      logger.info(`Notification skipped (no email address): ${label}`)
      return false
    }
    const notifications = container.resolve(Modules.NOTIFICATION)
    await notifications.createNotifications({
      to,
      channel: EMAIL_CHANNEL,
      template: request.template,
      content: request.email,
      data: { resource_type: request.resource.type, resource_id: request.resource.id },
      resource_type: request.resource.type,
      resource_id: request.resource.id,
      trigger_type: request.template,
      idempotency_key: request.idempotencyKey,
    })
    return true
  } catch (error) {
    logger.error(`Notification failed: ${label}: ${(error as Error)?.message ?? error}`)
    return false
  }
}
