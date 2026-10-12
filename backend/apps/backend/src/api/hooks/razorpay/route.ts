import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createHash } from "crypto"
import { razorpayConfig } from "../../../modules/razorpay/lib/config"
import { handleOnce } from "../../../modules/razorpay/lib/once"
import { verifyWebhookSignature } from "../../../modules/razorpay/lib/signature"
import { RAZORPAY_WEBHOOKS_MODULE } from "../../../modules/razorpay-webhooks"
import RazorpayWebhooksModuleService from "../../../modules/razorpay-webhooks/service"
import { handleRazorpayEvent, RazorpayWebhookBody } from "./handle-event"

// Razorpay webhooks (set the URL to https://<your backend>/hooks/razorpay in the Razorpay dashboard, with
// the events payment.authorized, payment.captured, payment.failed, refund.created and refund.processed).
//   1. Check X-Razorpay-Signature against the raw body with RAZORPAY_WEBHOOK_SECRET. Anything unsigned or
//      wrongly signed gets a 400 and nothing else happens.
//   2. Handle each event id once (X-Razorpay-Event-Id); a repeat gets a 200 and is skipped.
//   3. Act on it (handle-event.ts). An error answers 500 so Razorpay retries.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const config = razorpayConfig()
  if (!config?.webhook_secret) {
    logger.warn("A Razorpay webhook arrived but RAZORPAY_WEBHOOK_SECRET is not set, so it was ignored.")
    return res.status(400).json({ message: "Webhooks are not configured" })
  }

  const rawBody = (req as MedusaRequest & { rawBody?: Buffer }).rawBody
  const signature = req.headers["x-razorpay-signature"]
  if (!verifyWebhookSignature({ rawBody, signature, webhookSecret: config.webhook_secret })) {
    logger.warn("A Razorpay webhook with a missing or wrong signature was ignored.")
    return res.status(400).json({ message: "Invalid signature" })
  }

  const body = req.body as RazorpayWebhookBody
  const headerId = req.headers["x-razorpay-event-id"]
  const eventId = (Array.isArray(headerId) ? headerId[0] : headerId) || `sha256:${createHash("sha256").update(rawBody!).digest("hex")}`

  const store: RazorpayWebhooksModuleService = req.scope.resolve(RAZORPAY_WEBHOOKS_MODULE)
  try {
    const outcome = await handleOnce(await store.claims(), eventId, body.event ?? "unknown", () =>
      handleRazorpayEvent(req.scope, body, eventId, config)
    )
    return res.json(outcome.status === "duplicate" ? { status: "duplicate" } : { status: "processed", result: outcome.result })
  } catch (error) {
    logger.error(`Razorpay webhook ${eventId} (${body.event}) failed and will be retried by Razorpay: ${(error as Error).message}`)
    return res.status(500).json({ message: "Could not process the event" })
  }
}
