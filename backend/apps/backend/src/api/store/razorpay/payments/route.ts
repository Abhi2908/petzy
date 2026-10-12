import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { RazorpayClient } from "../../../../modules/razorpay/lib/client"
import { RAZORPAY_PROVIDER_ID, razorpayConfig } from "../../../../modules/razorpay/lib/config"
import { toPaise } from "../../../../modules/razorpay/lib/money"
import { verifyPaymentSignature } from "../../../../modules/razorpay/lib/signature"
import { assertPaymentMatches, RazorpaySessionData } from "../../../../modules/razorpay/service"
import { RecordRazorpayPaymentBody } from "../validators"

const notAllowed = (message: string) => new MedusaError(MedusaError.Types.NOT_ALLOWED, message)

// Called by the storefront right after Razorpay Checkout reports success, before it completes the cart.
// Nothing from the browser is trusted on its own:
//   1. the Checkout signature must be valid for this order and payment (HMAC with our key secret);
//   2. the order must be the one in this cart's pending Razorpay payment session;
//   3. Razorpay's own record of the payment must show the right order, INR, and exactly the cart total;
// then the payment id and signature are saved on the session, and completing the cart authorises it
// (the provider checks all of this again there).
export async function POST(req: MedusaRequest<RecordRazorpayPaymentBody>, res: MedusaResponse) {
  const config = razorpayConfig()
  if (!config) {
    throw notAllowed("Online payment is not set up on this store.")
  }
  const body = req.validatedBody
  if (
    !verifyPaymentSignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
      keySecret: config.key_secret,
    })
  ) {
    throw notAllowed("We could not verify this payment. If money left your account it will be refunded; please try again.")
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [cart],
  } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "total",
      "currency_code",
      "completed_at",
      "payment_collection.payment_sessions.id",
      "payment_collection.payment_sessions.provider_id",
      "payment_collection.payment_sessions.status",
      "payment_collection.payment_sessions.amount",
      "payment_collection.payment_sessions.currency_code",
      "payment_collection.payment_sessions.data",
    ],
    filters: { id: body.cart_id },
  })
  if (!cart) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "We could not find your cart.")
  }
  if (cart.completed_at) {
    return res.json({ status: "already_completed" })
  }

  const session = (cart.payment_collection?.payment_sessions ?? []).find(
    (s) => s?.provider_id === RAZORPAY_PROVIDER_ID && (s.data as Partial<RazorpaySessionData>)?.razorpay_order_id === body.razorpay_order_id
  )
  if (!session) {
    throw notAllowed("This payment is for a different checkout. Please refresh the page; if you were charged, we will refund it.")
  }
  const data = session.data as unknown as RazorpaySessionData

  // The cart total, worked out on the server, must equal what the Razorpay order was created for.
  if (toPaise(cart.total as never) !== data.amount) {
    throw notAllowed("Your cart changed after you started paying. Please refresh the page; if you were charged, we will refund it.")
  }
  const payment = await new RazorpayClient(config).fetchPayment(body.razorpay_payment_id)
  assertPaymentMatches(payment, { orderId: data.razorpay_order_id, amount: data.amount })

  await req.scope.resolve(Modules.PAYMENT).updatePaymentSession({
    id: session.id,
    amount: session.amount as never,
    currency_code: session.currency_code,
    data: { ...data, razorpay_payment_id: body.razorpay_payment_id, razorpay_signature: body.razorpay_signature },
  })
  res.json({ status: "verified" })
}
