import { MedusaService } from "@medusajs/framework/utils"
import { EventClaims } from "../razorpay/lib/once"
import RazorpayWebhookEvent from "./models/razorpay-webhook-event"

class RazorpayWebhooksModuleService extends MedusaService({ RazorpayWebhookEvent }) {
  /** The duplicate guard used by the webhook route, backed by this module's table. */
  async claims(): Promise<EventClaims> {
    return {
      claim: async (eventId, event) => {
        try {
          await this.createRazorpayWebhookEvents({ id: eventId, event })
          return true
        } catch (error) {
          const e = error as { code?: string; message?: string }
          if (e?.code === "23505" || /unique|duplicate|already exists/i.test(e?.message ?? "")) {
            return false
          }
          throw error
        }
      },
      release: async (eventId) => {
        await this.deleteRazorpayWebhookEvents(eventId)
      },
      finish: async (eventId, result) => {
        await this.updateRazorpayWebhookEvents({ id: eventId, result })
      },
    }
  }
}

export default RazorpayWebhooksModuleService
