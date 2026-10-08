import { Logger, ProviderSendNotificationDTO, ProviderSendNotificationResultsDTO } from "@medusajs/framework/types"
import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"

type ResendOptions = { api_key: string; from: string }

const RESEND_URL = "https://api.resend.com/emails"
const TIMEOUT_MS = 10_000

// Sends email through Resend's REST API (https://resend.com/docs/api-reference/emails/send-email) with
// plain fetch, so no extra package is needed. The API key is only ever placed in the Authorization header:
// it is never logged and never part of an error message.
class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend"
  protected logger_: Logger
  protected options_: ResendOptions

  static validateOptions(options: Record<string, unknown>) {
    if (!options?.api_key || !options?.from) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "The Resend email provider needs RESEND_API_KEY and NOTIFY_FROM_EMAIL")
    }
  }

  constructor({ logger }: { logger: Logger }, options: ResendOptions) {
    super()
    this.logger_ = logger
    this.options_ = options
  }

  async send(notification: ProviderSendNotificationDTO): Promise<ProviderSendNotificationResultsDTO> {
    const content = notification.content
    if (!notification.to || !content?.subject || !(content.html || content.text)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "An email needs a recipient, a subject and a body")
    }

    let response: Response
    try {
      response = await fetch(RESEND_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.options_.api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: notification.from || this.options_.from,
          to: [notification.to],
          subject: content.subject,
          html: content.html,
          text: content.text,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (error) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Could not reach Resend: ${(error as Error).message}`)
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string; name?: string }
    if (!response.ok) {
      // Resend's error body says what is wrong (for example an unverified sending domain); it never echoes the key.
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resend refused the email (${response.status}): ${data.message ?? data.name ?? response.statusText}`
      )
    }
    return { id: data.id }
  }
}

export default ResendNotificationProviderService
