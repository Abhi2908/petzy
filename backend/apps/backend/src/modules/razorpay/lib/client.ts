import { MedusaError } from "@medusajs/framework/utils"
import { RazorpayConfig } from "./config"

// A small client for the parts of Razorpay's REST API we use (https://razorpay.com/docs/api/), with plain
// fetch so no SDK is needed. Amounts here are always whole paise.

export type RazorpayOrder = {
  id: string
  amount: number
  amount_paid: number
  currency: string
  receipt: string | null
  status: "created" | "attempted" | "paid"
  notes?: Record<string, string>
}

export type RazorpayPayment = {
  id: string
  order_id: string | null
  amount: number
  amount_refunded?: number
  currency: string
  status: "created" | "authorized" | "captured" | "refunded" | "failed"
  method?: string
  captured?: boolean
  error_description?: string | null
}

export type RazorpayRefund = { id: string; payment_id: string; amount: number; status: string }

const TIMEOUT_MS = 15_000

export class RazorpayClient {
  constructor(private readonly config: Pick<RazorpayConfig, "key_id" | "key_secret" | "api_base">) {}

  private async request<T>(method: "GET" | "POST", path: string, body?: Record<string, unknown>): Promise<T> {
    const auth = Buffer.from(`${this.config.key_id}:${this.config.key_secret}`).toString("base64")
    let response: Response
    try {
      response = await fetch(`${this.config.api_base}${path}`, {
        method,
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (error) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Could not reach Razorpay: ${(error as Error).message}`)
    }
    const data = (await response.json().catch(() => ({}))) as { error?: { description?: string; code?: string } }
    if (!response.ok) {
      // Razorpay's error body describes the problem (bad request, unknown id); it never contains our keys.
      throw new MedusaError(
        response.status === 400 || response.status === 404 ? MedusaError.Types.INVALID_DATA : MedusaError.Types.UNEXPECTED_STATE,
        `Razorpay: ${data.error?.description ?? response.statusText} (${response.status})`
      )
    }
    return data as T
  }

  createOrder(input: { amount: number; currency: string; receipt: string; notes?: Record<string, string> }) {
    return this.request<RazorpayOrder>("POST", "/orders", input)
  }

  fetchOrder(orderId: string) {
    return this.request<RazorpayOrder>("GET", `/orders/${encodeURIComponent(orderId)}`)
  }

  async fetchOrderPayments(orderId: string) {
    const res = await this.request<{ items: RazorpayPayment[] }>("GET", `/orders/${encodeURIComponent(orderId)}/payments`)
    return res.items ?? []
  }

  fetchPayment(paymentId: string) {
    return this.request<RazorpayPayment>("GET", `/payments/${encodeURIComponent(paymentId)}`)
  }

  capturePayment(paymentId: string, amount: number, currency: string) {
    return this.request<RazorpayPayment>("POST", `/payments/${encodeURIComponent(paymentId)}/capture`, { amount, currency })
  }

  refundPayment(paymentId: string, amount: number, notes?: Record<string, string>) {
    return this.request<RazorpayRefund>("POST", `/payments/${encodeURIComponent(paymentId)}/refund`, { amount, notes })
  }
}
