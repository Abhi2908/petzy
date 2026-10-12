import { signPayment, signWebhookBody, verifyPaymentSignature, verifyWebhookSignature } from "../lib/signature"

const SECRET = "test_key_secret"
const WEBHOOK_SECRET = "test_webhook_secret"

describe("razorpay Checkout signature", () => {
  const good = { orderId: "order_ABC", paymentId: "pay_XYZ", keySecret: SECRET }

  it("accepts the signature Razorpay computes", () => {
    // Reference value computed independently: printf 'order_ABC|pay_XYZ' | openssl dgst -sha256 -hmac test_key_secret
    const signature = signPayment("order_ABC", "pay_XYZ", SECRET)
    expect(signature).toBe("1c7bec40722e46b00641872d69ec411ad3c5d536d60b6201bacaa4f53ef364e5")
    expect(verifyPaymentSignature({ ...good, signature })).toBe(true)
    expect(verifyPaymentSignature({ ...good, signature: signature.toUpperCase() })).toBe(true)
  })

  it("rejects a wrong signature, another order or payment, or another secret", () => {
    const signature = signPayment("order_ABC", "pay_XYZ", SECRET)
    expect(verifyPaymentSignature({ ...good, signature: signPayment("order_ABC", "pay_OTHER", SECRET) })).toBe(false)
    expect(verifyPaymentSignature({ ...good, orderId: "order_OTHER", signature })).toBe(false)
    expect(verifyPaymentSignature({ ...good, keySecret: "another_secret", signature })).toBe(false)
    expect(verifyPaymentSignature({ ...good, signature: signature.slice(0, -1) + (signature.endsWith("0") ? "1" : "0") })).toBe(false)
    expect(verifyPaymentSignature({ ...good, signature: "not-hex" })).toBe(false)
  })

  it("rejects anything missing", () => {
    const signature = signPayment("order_ABC", "pay_XYZ", SECRET)
    expect(verifyPaymentSignature({ ...good, signature: undefined })).toBe(false)
    expect(verifyPaymentSignature({ ...good, signature: "" })).toBe(false)
    expect(verifyPaymentSignature({ ...good, paymentId: null, signature })).toBe(false)
    expect(verifyPaymentSignature({ ...good, keySecret: undefined, signature })).toBe(false)
  })
})

describe("razorpay webhook signature", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1", amount: 149900 } } } })

  it("accepts a body signed with the webhook secret", () => {
    const signature = signWebhookBody(body, WEBHOOK_SECRET)
    expect(verifyWebhookSignature({ rawBody: Buffer.from(body), signature, webhookSecret: WEBHOOK_SECRET })).toBe(true)
    expect(verifyWebhookSignature({ rawBody: body, signature: [signature], webhookSecret: WEBHOOK_SECRET })).toBe(true)
  })

  it("rejects a changed body, a wrong secret or a wrong signature", () => {
    const signature = signWebhookBody(body, WEBHOOK_SECRET)
    const tampered = body.replace("149900", "100")
    expect(verifyWebhookSignature({ rawBody: tampered, signature, webhookSecret: WEBHOOK_SECRET })).toBe(false)
    // Re-serialising the parsed body (spacing, key order) also breaks it: the raw bytes must be used.
    expect(verifyWebhookSignature({ rawBody: JSON.stringify(JSON.parse(body), null, 2), signature, webhookSecret: WEBHOOK_SECRET })).toBe(false)
    expect(verifyWebhookSignature({ rawBody: body, signature, webhookSecret: SECRET })).toBe(false)
    expect(verifyWebhookSignature({ rawBody: body, signature: "0".repeat(64), webhookSecret: WEBHOOK_SECRET })).toBe(false)
  })

  it("ignores anything unsigned or unconfigured", () => {
    const signature = signWebhookBody(body, WEBHOOK_SECRET)
    expect(verifyWebhookSignature({ rawBody: body, signature: undefined, webhookSecret: WEBHOOK_SECRET })).toBe(false)
    expect(verifyWebhookSignature({ rawBody: body, signature: "", webhookSecret: WEBHOOK_SECRET })).toBe(false)
    expect(verifyWebhookSignature({ rawBody: undefined, signature, webhookSecret: WEBHOOK_SECRET })).toBe(false)
    expect(verifyWebhookSignature({ rawBody: "", signature, webhookSecret: WEBHOOK_SECRET })).toBe(false)
    expect(verifyWebhookSignature({ rawBody: body, signature, webhookSecret: null })).toBe(false)
  })
})
