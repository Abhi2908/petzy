// Razorpay settings come from environment variables only (see .env.template). The secrets are passed to the
// provider and the routes that need them, and never logged.

export type RazorpayConfig = {
  key_id: string
  key_secret: string
  webhook_secret: string | null
  /** Razorpay's API. Overridable only so the integration tests can point it at a mock server. */
  api_base: string
}

export function razorpayConfig(env: NodeJS.ProcessEnv = process.env): RazorpayConfig | null {
  const key_id = env.RAZORPAY_KEY_ID?.trim()
  const key_secret = env.RAZORPAY_KEY_SECRET?.trim()
  if (!key_id || !key_secret) {
    return null
  }
  return {
    key_id,
    key_secret,
    webhook_secret: env.RAZORPAY_WEBHOOK_SECRET?.trim() || null,
    api_base: (env.RAZORPAY_API_BASE?.trim() || "https://api.razorpay.com/v1").replace(/\/+$/, ""),
  }
}

export const RAZORPAY_PROVIDER_ID = "pp_razorpay_razorpay"
