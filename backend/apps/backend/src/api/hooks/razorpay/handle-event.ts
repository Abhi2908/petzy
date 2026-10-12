import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, PaymentActions } from "@medusajs/framework/utils"
import { processPaymentWorkflow } from "@medusajs/medusa/core-flows"
import { RazorpayClient, RazorpayPayment, RazorpayRefund } from "../../../modules/razorpay/lib/client"
import { RazorpayConfig } from "../../../modules/razorpay/lib/config"
import { fromPaise } from "../../../modules/razorpay/lib/money"
import { RazorpaySessionData } from "../../../modules/razorpay/service"

export type RazorpayWebhookBody = {
  event: string
  payload?: {
    payment?: { entity: RazorpayPayment }
    refund?: { entity: RazorpayRefund }
  }
}

/**
 * Acts on one verified, first-time Razorpay event and returns a short note of what happened (stored with
 * the event id). Throws only for errors worth a retry (Razorpay redelivers on non-2xx).
 */
export async function handleRazorpayEvent(
  container: MedusaContainer,
  body: RazorpayWebhookBody,
  eventId: string,
  config: RazorpayConfig
): Promise<string> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const client = new RazorpayClient(config)
  const payments = container.resolve(Modules.PAYMENT)

  /** The Medusa payment session behind a Razorpay order, found through the order's receipt (our session id). */
  const sessionFor = async (orderId: string) => {
    const order = await client.fetchOrder(orderId)
    const sessionId = order.receipt || order.notes?.medusa_session_id
    const [session] = sessionId ? await payments.listPaymentSessions({ id: sessionId }) : []
    return session
  }

  switch (body.event) {
    case "payment.authorized":
    case "payment.captured": {
      // Covers a customer who paid but whose browser never came back to place the order.
      const payment = body.payload?.payment?.entity
      if (!payment?.order_id) {
        return "ignored: payment without an order"
      }
      // Re-read the payment from Razorpay rather than trusting the webhook body's copy.
      const fresh = await client.fetchPayment(payment.id)
      const session = await sessionFor(fresh.order_id!)
      const data = session?.data as Partial<RazorpaySessionData> | undefined
      if (!session || data?.razorpay_order_id !== fresh.order_id || data?.amount !== fresh.amount || fresh.currency !== "INR") {
        logger.error(
          `Razorpay payment ${fresh.id} (order ${fresh.order_id}) does not match a Medusa checkout. If no order was placed for it, refund it in the Razorpay dashboard.`
        )
        return "unmatched: needs a manual check"
      }
      if (!data.razorpay_payment_id) {
        await payments.updatePaymentSession({
          id: session.id,
          amount: session.amount,
          currency_code: session.currency_code,
          data: { ...data, razorpay_payment_id: fresh.id, verified_by_webhook_event: eventId },
        })
      }
      await processPaymentWorkflow(container).run({
        input: {
          action: fresh.status === "captured" ? PaymentActions.SUCCESSFUL : PaymentActions.AUTHORIZED,
          data: { session_id: session.id, amount: fromPaise(fresh.amount) as unknown as number },
        },
      })
      return `payment ${fresh.status}: recorded for session ${session.id}`
    }

    case "payment.failed": {
      const payment = body.payload?.payment?.entity
      logger.info(`Razorpay payment ${payment?.id} failed: ${payment?.error_description ?? "no reason given"}. The customer can retry.`)
      return "payment failed: nothing to do"
    }

    case "refund.created":
    case "refund.processed": {
      const refund = body.payload?.refund?.entity
      if (!refund) {
        return "ignored: no refund in payload"
      }
      // Refunds made in Admin are already recorded (the provider saves their ids). One made directly in the
      // Razorpay dashboard is not, so flag it for staff.
      const payment = await client.fetchPayment(refund.payment_id)
      const session = payment.order_id ? await sessionFor(payment.order_id) : undefined
      const [medusaPayment] = session ? await payments.listPayments({ payment_session_id: session.id }) : []
      const known = ((medusaPayment?.data as Partial<RazorpaySessionData>)?.refunds ?? []).some((r) => r.id === refund.id)
      if (!known) {
        logger.warn(
          `Razorpay refund ${refund.id} of Rs ${fromPaise(refund.amount)} on payment ${refund.payment_id} was made outside Medusa. Record it on the order in Admin if needed.`
        )
        return "refund made outside Medusa: flagged"
      }
      return `refund ${body.event === "refund.processed" ? "processed" : "created"}: already recorded`
    }

    default:
      return `ignored: ${body.event}`
  }
}
