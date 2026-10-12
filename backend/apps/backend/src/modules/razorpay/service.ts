import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  PaymentSessionStatus,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { AbstractPaymentProvider, MedusaError, PaymentActions } from "@medusajs/framework/utils"
import { RazorpayClient, RazorpayPayment } from "./lib/client"
import { RazorpayConfig } from "./lib/config"
import { fromPaise, toPaise } from "./lib/money"
import { verifyPaymentSignature } from "./lib/signature"

/**
 * What we keep in the Medusa payment session's `data`. Amounts are paise. The key id is public (Checkout.js
 * needs it); the key secret is never stored here.
 */
export type RazorpaySessionData = {
  razorpay_order_id: string
  amount: number
  currency: "INR"
  key_id: string
  session_id: string
  // Added once the customer has paid (by /store/razorpay/payments or the webhook route):
  razorpay_payment_id?: string
  razorpay_signature?: string
  verified_by_webhook_event?: string
  // Added by authorize / capture / refund:
  razorpay_payment_status?: RazorpayPayment["status"]
  razorpay_method?: string
  refunds?: { id: string; amount: number }[]
}

const notAllowed = (message: string) => new MedusaError(MedusaError.Types.NOT_ALLOWED, message)

/** The checks a payment must pass before we treat it as paid. Shared with the verify route. */
export function assertPaymentMatches(
  payment: Pick<RazorpayPayment, "order_id" | "amount" | "currency" | "status">,
  expected: { orderId: string; amount: number }
) {
  if (payment.order_id !== expected.orderId) {
    throw notAllowed("This payment belongs to a different order.")
  }
  if (payment.currency !== "INR" || payment.amount !== expected.amount) {
    throw notAllowed("The amount paid does not match the order total. You have not been charged twice; please contact us.")
  }
  if (payment.status !== "authorized" && payment.status !== "captured") {
    throw notAllowed("The payment has not gone through yet. Please try again.")
  }
}

const STATUS: Record<RazorpayPayment["status"], PaymentSessionStatus> = {
  created: "pending",
  authorized: "authorized",
  captured: "captured",
  refunded: "captured",
  failed: "error",
}

// Razorpay as a Medusa payment provider: https://docs.medusajs.com/resources/references/payment/provider
// Identifier "razorpay" + id "razorpay" in medusa-config make the provider id pp_razorpay_razorpay.
class RazorpayProviderService extends AbstractPaymentProvider<RazorpayConfig> {
  static identifier = "razorpay"

  protected logger_: Logger
  protected config_: RazorpayConfig
  protected client_: RazorpayClient

  static validateOptions(options: Record<string, unknown>) {
    if (!options?.key_id || !options?.key_secret) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "The Razorpay provider needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET")
    }
  }

  constructor({ logger }: { logger: Logger }, options: RazorpayConfig) {
    super({ logger }, options)
    this.logger_ = logger
    this.config_ = options
    this.client_ = new RazorpayClient(options)
  }

  /** A payment session starts: create a Razorpay order for exactly this amount, in paise. */
  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    if (input.currency_code?.toLowerCase() !== "inr") {
      throw notAllowed("Online payment is only available in Indian rupees.")
    }
    const amount = toPaise(input.amount)
    if (amount < 100) {
      throw notAllowed("Online payment needs a total of at least Rs 1.")
    }
    const sessionId = String(input.data?.session_id ?? "")
    const order = await this.client_.createOrder({
      amount,
      currency: "INR",
      receipt: sessionId.slice(0, 40), // Razorpay allows 40 characters; Medusa session ids are shorter
      notes: { medusa_session_id: sessionId },
    })
    const data: RazorpaySessionData = {
      razorpay_order_id: order.id,
      amount,
      currency: "INR",
      key_id: this.config_.key_id,
      session_id: sessionId,
    }
    return { id: order.id, data, status: "pending" }
  }

  /**
   * Called when the session's amount changes (the cart changed) or when the verify route records the
   * customer's payment. A new amount needs a new Razorpay order; the same amount keeps the order and
   * merges the payment details in.
   */
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const current = (input.data ?? {}) as Partial<RazorpaySessionData>
    const amount = toPaise(input.amount)
    if (current.razorpay_order_id && current.amount === amount) {
      return { data: current as Record<string, unknown> }
    }
    if (current.razorpay_payment_id) {
      throw notAllowed("This payment is already made, so the amount cannot change. Please contact us.")
    }
    const fresh = await this.initiatePayment({ ...input, data: { session_id: current.session_id } })
    return { data: fresh.data, status: "pending" }
  }

  /**
   * Completing the cart. The customer's browser can only tell us a payment id; everything else is checked
   * here, server side: the Checkout signature (or a verified webhook), then Razorpay's own record of the
   * payment: right order, right amount in paise, right currency, actually authorised or captured.
   */
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const data = (input.data ?? {}) as Partial<RazorpaySessionData>
    if (!data.razorpay_order_id || !data.amount) {
      throw notAllowed("This payment session is incomplete. Please start the payment again.")
    }
    if (!data.razorpay_payment_id) {
      throw notAllowed("We have not received your payment yet. Please complete it in the Razorpay window.")
    }
    const signedByCheckout = verifyPaymentSignature({
      orderId: data.razorpay_order_id,
      paymentId: data.razorpay_payment_id,
      signature: data.razorpay_signature,
      keySecret: this.config_.key_secret,
    })
    if (!signedByCheckout && !data.verified_by_webhook_event) {
      throw notAllowed("We could not verify this payment. You have not been charged twice; please try again or contact us.")
    }

    const payment = await this.client_.fetchPayment(data.razorpay_payment_id)
    assertPaymentMatches(payment, { orderId: data.razorpay_order_id, amount: data.amount })
    return {
      status: payment.status === "captured" ? "captured" : "authorized",
      data: { ...data, razorpay_payment_status: payment.status, razorpay_method: payment.method },
    }
  }

  /** Capture an authorised payment. Razorpay accounts set to auto-capture are already captured: fine. */
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const data = (input.data ?? {}) as Partial<RazorpaySessionData>
    if (!data.razorpay_payment_id || !data.amount) {
      throw notAllowed("There is no Razorpay payment to capture.")
    }
    const payment = await this.client_.fetchPayment(data.razorpay_payment_id)
    if (payment.status === "captured" || payment.status === "refunded") {
      return { data: { ...data, razorpay_payment_status: payment.status } }
    }
    const captured = await this.client_.capturePayment(data.razorpay_payment_id, data.amount, "INR")
    return { data: { ...data, razorpay_payment_status: captured.status } }
  }

  /** Refund all or part of a captured payment. Medusa passes rupees; Razorpay gets paise. */
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const data = (input.data ?? {}) as Partial<RazorpaySessionData>
    if (!data.razorpay_payment_id) {
      throw notAllowed("There is no Razorpay payment to refund.")
    }
    const amount = toPaise(input.amount)
    if (amount <= 0) {
      throw notAllowed("The refund amount must be more than 0.")
    }
    const refund = await this.client_.refundPayment(data.razorpay_payment_id, amount, { medusa_session_id: data.session_id ?? "" })
    return { data: { ...data, refunds: [...(data.refunds ?? []), { id: refund.id, amount: refund.amount }] } }
  }

  /**
   * Razorpay has no "void": an authorised payment that is never captured is refunded to the customer
   * automatically by Razorpay (within a few days). So cancelling only records the state; a captured payment
   * must be refunded instead, and we say so.
   */
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const data = (input.data ?? {}) as Partial<RazorpaySessionData>
    if (data.razorpay_payment_id) {
      const payment = await this.client_.fetchPayment(data.razorpay_payment_id)
      if (payment.status === "captured") {
        throw notAllowed("This payment is already captured. Refund it instead of cancelling.")
      }
      this.logger_.info(`Razorpay payment ${payment.id} cancelled in Medusa; Razorpay releases uncaptured payments automatically.`)
      return { data: { ...data, razorpay_payment_status: payment.status } }
    }
    return { data: data as Record<string, unknown> }
  }

  /** Unpaid Razorpay orders simply expire, so there is nothing to delete there. */
  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const data = (input.data ?? {}) as Partial<RazorpaySessionData>
    if (data.razorpay_payment_id) {
      const payment = await this.client_.fetchPayment(data.razorpay_payment_id)
      return { status: STATUS[payment.status] ?? "pending", data: { ...data, razorpay_payment_status: payment.status } }
    }
    if (!data.razorpay_order_id) {
      return { status: "pending" }
    }
    const payments = await this.client_.fetchOrderPayments(data.razorpay_order_id)
    const best = payments.find((p) => p.status === "captured") ?? payments.find((p) => p.status === "authorized")
    return { status: best ? STATUS[best.status] : "pending", data: data as Record<string, unknown> }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const data = (input.data ?? {}) as Partial<RazorpaySessionData>
    if (data.razorpay_payment_id) {
      const payment = await this.client_.fetchPayment(data.razorpay_payment_id)
      return { data: { ...data, razorpay_payment_status: payment.status, amount_paid: fromPaise(payment.amount) } }
    }
    return { data: data as Record<string, unknown> }
  }

  /**
   * Medusa's generic /hooks/payment/:provider route is not used for Razorpay: it queues events before any
   * signature check and does not drop duplicates. Point Razorpay webhooks at /hooks/razorpay instead,
   * which verifies the signature first, handles each event once, then runs Medusa's payment workflow.
   */
  async getWebhookActionAndData(_payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }
}

export default RazorpayProviderService
