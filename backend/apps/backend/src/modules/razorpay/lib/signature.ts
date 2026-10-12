import { createHmac, timingSafeEqual } from "crypto"

// Razorpay signs two things with HMAC-SHA256 (hex):
//  - the Checkout result: "<razorpay_order_id>|<razorpay_payment_id>", signed with the API key secret;
//  - webhooks: the raw request body, signed with the webhook secret (a different value you set in the
//    Razorpay dashboard), sent in the X-Razorpay-Signature header.
// Both checks compare in constant time and treat anything missing as invalid.

function safeEqualHex(expected: string, given: string): boolean {
  if (!/^[0-9a-f]+$/i.test(given) || given.length !== expected.length) {
    return false
  }
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(given.toLowerCase(), "hex"))
}

const hmac = (secret: string, payload: string | Buffer) => createHmac("sha256", secret).update(payload).digest("hex")

export function verifyPaymentSignature(input: {
  orderId?: string | null
  paymentId?: string | null
  signature?: string | null
  keySecret?: string | null
}): boolean {
  const { orderId, paymentId, signature, keySecret } = input
  if (!orderId || !paymentId || !signature || !keySecret) {
    return false
  }
  return safeEqualHex(hmac(keySecret, `${orderId}|${paymentId}`), signature)
}

export function verifyWebhookSignature(input: {
  rawBody?: Buffer | string | null
  signature?: string | string[] | null
  webhookSecret?: string | null
}): boolean {
  const { rawBody, webhookSecret } = input
  const signature = Array.isArray(input.signature) ? input.signature[0] : input.signature
  if (!rawBody || !rawBody.length || !signature || !webhookSecret) {
    return false
  }
  return safeEqualHex(hmac(webhookSecret, rawBody), signature)
}

/** For tests and local webhook testing: signs a body the way Razorpay does. */
export function signWebhookBody(rawBody: string | Buffer, webhookSecret: string): string {
  return hmac(webhookSecret, rawBody)
}

/** For tests: signs a Checkout result the way Razorpay does. */
export function signPayment(orderId: string, paymentId: string, keySecret: string): string {
  return hmac(keySecret, `${orderId}|${paymentId}`)
}
