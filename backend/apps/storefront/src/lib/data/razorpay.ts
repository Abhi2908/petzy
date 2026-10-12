"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

export type RazorpayCheckoutResult = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

/**
 * Hands Razorpay Checkout's result to the backend, which checks the signature and Razorpay's own record of
 * the payment against the cart total before the order can be placed. Returns the API's message on failure
 * (thrown server action errors are hidden in production).
 */
export async function recordRazorpayPayment(
  cartId: string,
  result: RazorpayCheckoutResult
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await sdk.client.fetch("/store/razorpay/payments", {
      method: "POST",
      body: {
        cart_id: cartId,
        razorpay_order_id: result.razorpay_order_id,
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_signature: result.razorpay_signature,
      },
      headers: await getAuthHeaders(),
      cache: "no-store",
    })
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error:
        (error as Error)?.message ||
        "We could not confirm your payment. Please try again.",
    }
  }
}
