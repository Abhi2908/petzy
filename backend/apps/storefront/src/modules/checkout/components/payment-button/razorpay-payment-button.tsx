"use client"

import { placeOrder } from "@lib/data/cart"
import {
  recordRazorpayPayment,
  RazorpayCheckoutResult,
} from "@lib/data/razorpay"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Button, Text } from "@modules/common/components/ui"
import { useEffect, useRef, useState } from "react"

// Razorpay Checkout (https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/).
// The script is only loaded when this button is on screen, which is the last checkout step.
const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js"

type RazorpayInstance = {
  open(): void
  on(
    event: "payment.failed",
    handler: (response: {
      error: { description?: string; reason?: string }
    }) => void
  ): void
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

let scriptPromise: Promise<void> | null = null

/** Loads Checkout.js once per page. A failed load can be retried. */
function loadCheckout(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) {
    return Promise.resolve()
  }
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script")
      script.src = CHECKOUT_SRC
      script.async = true
      script.onload = () =>
        window.Razorpay ? resolve() : reject(new Error("Razorpay did not load"))
      script.onerror = () => reject(new Error("Razorpay did not load"))
      document.body.appendChild(script)
    }).catch((error) => {
      scriptPromise = null
      throw error
    })
  }
  return scriptPromise
}

type SessionData = {
  razorpay_order_id: string
  amount: number
  currency: string
  key_id: string
}

type Status = "idle" | "open" | "confirming" | "placing" | "paid_not_placed"

const RazorpayPaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const session = cart.payment_collection?.payment_sessions?.find(
    (s) => s.provider_id === "pp_razorpay_razorpay" && s.status === "pending"
  )
  const data = session?.data as SessionData | undefined

  const [status, setStatusState] = useState<Status>("idle")
  // The Razorpay callbacks are created when the window opens, so they read the stage from a ref, never
  // from a stale render.
  const stage = useRef<Status>("idle")
  const setStatus = (next: Status) => {
    stage.current = next
    setStatusState(next)
  }
  const [message, setMessage] = useState<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)
  // A ref, not state, so two quick clicks cannot both open a payment window.
  const busy = useRef(false)

  useEffect(() => {
    loadCheckout()
      .then(() => setScriptReady(true))
      .catch(() =>
        setMessage(
          "We could not load the payment window. Check your connection and try again."
        )
      )
  }, [])

  const total = convertToLocale({
    amount: cart.total ?? 0,
    currency_code: cart.currency_code,
    locale: "en-IN",
  })

  const finish = async () => {
    setStatus("placing")
    try {
      await placeOrder() // redirects to the order confirmation page
    } catch (error) {
      setStatus("paid_not_placed")
      setMessage(
        `Your payment went through, but we could not place the order yet: ${
          (error as Error).message
        } Please do not pay again. Try placing the order again, or contact us and we will sort it out.`
      )
      busy.current = false
    }
  }

  const onPaid = async (result: RazorpayCheckoutResult) => {
    setStatus("confirming")
    setMessage(null)
    const recorded = await recordRazorpayPayment(cart.id, result)
    if (!recorded.ok) {
      setStatus("idle")
      setMessage(recorded.error)
      busy.current = false
      return
    }
    await finish()
  }

  const pay = async () => {
    if (busy.current || !data) {
      return
    }
    busy.current = true
    setMessage(null)
    try {
      await loadCheckout()
    } catch {
      busy.current = false
      setMessage(
        "We could not load the payment window. Check your connection and try again."
      )
      return
    }
    const address = cart.billing_address ?? cart.shipping_address
    const checkout = new window.Razorpay!({
      key: data.key_id,
      order_id: data.razorpay_order_id,
      amount: data.amount,
      currency: data.currency,
      name: "Petzy",
      description: "Your Petzy order",
      prefill: {
        name: [address?.first_name, address?.last_name]
          .filter(Boolean)
          .join(" "),
        email: cart.email ?? undefined,
        contact: address?.phone ?? undefined,
      },
      notes: { cart_id: cart.id },
      theme: { color: "#FF6B4A" },
      handler: (result: RazorpayCheckoutResult) => {
        onPaid(result)
      },
      modal: {
        // The customer closed the window without paying (Razorpay keeps it open after a failed attempt so
        // they can retry inside it; closing it lands here too).
        ondismiss: () => {
          if (busy.current && stage.current === "open") {
            busy.current = false
            setStatus("idle")
            setMessage(
              (current) =>
                current ??
                "Payment cancelled. You have not been charged; you can try again whenever you are ready."
            )
          }
        },
      },
    })
    checkout.on("payment.failed", (response) => {
      setMessage(
        `The payment did not go through${
          response.error?.description ? `: ${response.error.description}` : "."
        } You can try again in the Razorpay window or choose another method.`
      )
    })
    setStatus("open")
    checkout.open()
  }

  if (!data) {
    return (
      <Text className="text-rose-700" data-testid="razorpay-session-missing">
        We could not start online payment. Go back to the payment step and
        choose it again.
      </Text>
    )
  }

  const working =
    status === "open" || status === "confirming" || status === "placing"

  return (
    <div className="flex flex-col gap-3">
      {status === "paid_not_placed" ? (
        <Button
          size="large"
          onClick={finish}
          data-testid="razorpay-retry-place-order"
        >
          Place order again
        </Button>
      ) : (
        <Button
          size="large"
          disabled={notReady || !scriptReady || working}
          isLoading={working}
          onClick={pay}
          data-testid={dataTestId}
        >
          Pay {total} securely
        </Button>
      )}
      <Text className="text-small-regular text-ui-fg-subtle">
        {status === "confirming"
          ? "Confirming your payment..."
          : status === "placing"
          ? "Payment received. Placing your order..."
          : "UPI, cards and netbanking through Razorpay. You confirm the payment in a secure Razorpay window."}
      </Text>
      {message && (
        <div
          className="rounded-rounded border border-rose-200 bg-rose-50 p-3"
          role="alert"
          data-testid="razorpay-payment-message"
        >
          <Text className="text-rose-700">{message}</Text>
        </div>
      )}
    </div>
  )
}

export default RazorpayPaymentButton
