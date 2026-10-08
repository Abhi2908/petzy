import { Logger, ProviderSendNotificationDTO, ProviderSendNotificationResultsDTO } from "@medusajs/framework/types"
import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"

// The development email provider: instead of sending, it writes who the email is for, the subject and
// the plain-text body to the server log. Used whenever Resend is not configured.
class LogNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "petzy-log"
  protected logger_: Logger

  constructor({ logger }: { logger: Logger }) {
    super()
    this.logger_ = logger
  }

  async send(notification: ProviderSendNotificationDTO): Promise<ProviderSendNotificationResultsDTO> {
    if (!notification?.to) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "A notification needs a recipient")
    }
    const subject = notification.content?.subject ?? notification.template
    const body = notification.content?.text ?? ""
    this.logger_.info(
      `[email, log only] to ${notification.to} | ${notification.template} | ${subject}\n${body.split("\n").map((l) => `    ${l}`).join("\n")}`
    )
    return {}
  }
}

export default LogNotificationProviderService
