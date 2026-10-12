import { z } from "@medusajs/framework/zod"

// What Razorpay Checkout hands the browser after a successful payment, plus the cart it was for.
export const RecordRazorpayPaymentSchema = z.object({
  cart_id: z.string().min(1),
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/, "Not a Razorpay order id"),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/, "Not a Razorpay payment id"),
  razorpay_signature: z.string().regex(/^[0-9a-f]{64}$/i, "Not a Razorpay signature"),
})
export type RecordRazorpayPaymentBody = z.infer<typeof RecordRazorpayPaymentSchema>
