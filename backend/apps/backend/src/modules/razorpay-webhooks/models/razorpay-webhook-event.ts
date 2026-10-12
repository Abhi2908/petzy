import { model } from "@medusajs/framework/utils"

// One row per Razorpay webhook event we have accepted, keyed by Razorpay's event id
// (X-Razorpay-Event-Id). The primary key makes a second delivery of the same event fail to insert, which
// is how duplicates are dropped. Only ids and the outcome are kept, no customer details.
const RazorpayWebhookEvent = model.define("razorpay_webhook_event", {
  id: model.text().primaryKey(), // Razorpay's event id
  event: model.text(), // for example "payment.captured"
  entity_id: model.text().nullable(), // the payment or refund id it was about
  result: model.text().nullable(), // what we did, for example "order placed" or "ignored"
})

export default RazorpayWebhookEvent
