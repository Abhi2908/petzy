import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  createUserAccountWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import http from "http"
import { AddressInfo } from "net"
import { signPayment, signWebhookBody } from "../../src/modules/razorpay/lib/signature"

jest.setTimeout(120_000)

// ---- A mock of the parts of Razorpay's API the provider uses -------------------------------------------
// The keys below exist only in this test. Medusa reads medusa-config.ts before the runner applies its `env`
// option, so they are set on process.env here, before the app starts, and removed at the end.
const KEY_ID = "rzp_test_mockkey"
const KEY_SECRET = "mock_key_secret"
const WEBHOOK_SECRET = "mock_webhook_secret"

type MockOrder = { id: string; amount: number; currency: string; receipt: string; status: string; notes: Record<string, string> }
type MockPayment = { id: string; order_id: string; amount: number; currency: string; status: string; method: string; amount_refunded: number }

const razorpay = {
  orders: new Map<string, MockOrder>(),
  payments: new Map<string, MockPayment>(),
  refunds: [] as { id: string; payment_id: string; amount: number }[],
  calls: [] as string[],
  counter: 0,
  reset() {
    this.orders.clear()
    this.payments.clear()
    this.refunds = []
    this.calls = []
  },
  /** The customer pays in the Razorpay window. */
  pay(orderId: string, overrides: Partial<MockPayment> = {}) {
    const order = this.orders.get(orderId)!
    const payment: MockPayment = {
      id: `pay_mock${++this.counter}`,
      order_id: orderId,
      amount: order.amount,
      currency: "INR",
      status: "captured",
      method: "upi",
      amount_refunded: 0,
      ...overrides,
    }
    this.payments.set(payment.id, payment)
    order.status = "paid"
    return payment
  },
}

const server = http.createServer((req, res) => {
  let raw = ""
  req.on("data", (c) => (raw += c))
  req.on("end", () => {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" })
      res.end(JSON.stringify(body))
    }
    const expected = `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`
    if (req.headers.authorization !== expected) {
      return send(401, { error: { description: "Authentication failed" } })
    }
    const body = raw ? JSON.parse(raw) : {}
    const path = (req.url ?? "").replace(/^\/v1/, "")
    razorpay.calls.push(`${req.method} ${path}`)
    let m: RegExpMatchArray | null
    if (req.method === "POST" && path === "/orders") {
      const order: MockOrder = { id: `order_mock${++razorpay.counter}`, status: "created", ...body }
      razorpay.orders.set(order.id, order)
      return send(200, order)
    }
    if (req.method === "GET" && (m = path.match(/^\/orders\/([^/]+)\/payments$/))) {
      return send(200, { items: [...razorpay.payments.values()].filter((p) => p.order_id === m![1]) })
    }
    if (req.method === "GET" && (m = path.match(/^\/orders\/([^/]+)$/))) {
      const order = razorpay.orders.get(m[1])
      return order ? send(200, order) : send(404, { error: { description: "The id provided does not exist" } })
    }
    if (req.method === "GET" && (m = path.match(/^\/payments\/([^/]+)$/))) {
      const payment = razorpay.payments.get(m[1])
      return payment ? send(200, payment) : send(404, { error: { description: "The id provided does not exist" } })
    }
    if (req.method === "POST" && (m = path.match(/^\/payments\/([^/]+)\/capture$/))) {
      const payment = razorpay.payments.get(m[1])!
      if (payment.status !== "authorized" || body.amount !== payment.amount) {
        return send(400, { error: { description: "Payment cannot be captured" } })
      }
      payment.status = "captured"
      return send(200, payment)
    }
    if (req.method === "POST" && (m = path.match(/^\/payments\/([^/]+)\/refund$/))) {
      const payment = razorpay.payments.get(m[1])!
      const refund = { id: `rfnd_mock${++razorpay.counter}`, payment_id: payment.id, amount: body.amount, status: "processed" }
      payment.amount_refunded += body.amount
      razorpay.refunds.push(refund)
      return send(200, refund)
    }
    return send(404, { error: { description: `No mock for ${req.method} ${path}` } })
  })
})

const ENV_KEYS = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "RAZORPAY_API_BASE"]
server.listen(0, "127.0.0.1")
const port = () => (server.address() as AddressInfo).port
// listen(0) picks a free port synchronously enough for the address to exist once the event loop turns; the
// app reads RAZORPAY_API_BASE only when it is configured in beforeAll, so a fixed fallback is not needed.
process.env.RAZORPAY_KEY_ID = KEY_ID
process.env.RAZORPAY_KEY_SECRET = KEY_SECRET
process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET
Object.defineProperty(process.env, "RAZORPAY_API_BASE", {
  configurable: true,
  enumerable: true,
  get: () => `http://127.0.0.1:${port()}/v1`,
})

afterAll(() => {
  server.close()
  for (const key of ENV_KEYS) {
    delete process.env[key]
  }
})

// ---- Test data ------------------------------------------------------------------------------------------
const PASSWORD = "Test-password-123"
type Headers = { headers: Record<string, string> }

async function failure(request: Promise<unknown>) {
  try {
    await request
  } catch (e) {
    return (e as { response: { status: number; data: { type?: string; message: string } } }).response
  }
  throw new Error("Expected the request to fail")
}

async function setupStore(container: MedusaContainer) {
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillment = container.resolve(Modules.FULFILLMENT)
  const {
    result: [region],
  } = await createRegionsWorkflow(container).run({
    input: { regions: [{ name: "India", currency_code: "inr", countries: ["in"], payment_providers: ["pp_razorpay_razorpay"] }] },
  })
  await createTaxRegionsWorkflow(container).run({ input: [{ country_code: "in", provider_id: "tp_system" }] })
  const {
    result: [channel],
  } = await createSalesChannelsWorkflow(container).run({ input: { salesChannelsData: [{ name: "Web" }] } })
  const {
    result: [key],
  } = await createApiKeysWorkflow(container).run({ input: { api_keys: [{ title: "Web", type: "publishable", created_by: "test" }] } })
  await linkSalesChannelsToApiKeyWorkflow(container).run({ input: { id: key.id, add: [channel.id] } })

  const {
    result: [profile],
  } = await createShippingProfilesWorkflow(container).run({ input: { data: [{ name: "Default", type: "default" }] } })
  const {
    result: [location],
  } = await createStockLocationsWorkflow(container).run({ input: { locations: [{ name: "Warehouse", address: { city: "Pune", country_code: "IN", address_1: "" } }] } })
  await link.create({ [Modules.STOCK_LOCATION]: { stock_location_id: location.id }, [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" } })
  const fset = await fulfillment.createFulfillmentSets({
    name: "India",
    type: "shipping",
    service_zones: [{ name: "India", geo_zones: [{ country_code: "in", type: "country" }] }],
  })
  await link.create({ [Modules.STOCK_LOCATION]: { stock_location_id: location.id }, [Modules.FULFILLMENT]: { fulfillment_set_id: fset.id } })
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fset.service_zones[0].id,
        shipping_profile_id: profile.id,
        type: { label: "Standard", description: "3-5 days", code: "standard" },
        prices: [{ currency_code: "inr", amount: 50 }, { region_id: region.id, amount: 50 }],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })
  await linkSalesChannelsToStockLocationWorkflow(container).run({ input: { id: location.id, add: [channel.id] } })

  const {
    result: [product],
  } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Chicken Kibble",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: profile.id,
          sales_channels: [{ id: channel.id }],
          options: [{ title: "Pack", values: ["5 kg"] }],
          variants: [{ title: "5 kg", manage_inventory: false, options: { Pack: "5 kg" }, prices: [{ amount: 1499.5, currency_code: "inr" }] }],
        },
      ],
    },
  })
  return { region, store: { headers: { "x-publishable-api-key": key.token } } as Headers, variantId: product.variants[0].id }
}

async function registerAdmin(api: any, container: MedusaContainer): Promise<Headers> {
  const email = "admin@pay.test"
  const registered = await api.post("/auth/user/emailpass/register", { email, password: PASSWORD })
  const payload = JSON.parse(Buffer.from(registered.data.token.split(".")[1], "base64url").toString())
  await createUserAccountWorkflow(container).run({ input: { authIdentityId: payload.auth_identity_id, userData: { email } } })
  const login = await api.post("/auth/user/emailpass", { email, password: PASSWORD })
  return { headers: { authorization: `Bearer ${login.data.token}` } }
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let store: Headers
    let admin: Headers
    let regionId: string
    let variantId: string

    beforeEach(async () => {
      razorpay.reset()
      const setup = await setupStore(getContainer())
      store = setup.store
      regionId = setup.region.id
      variantId = setup.variantId
      admin = await registerAdmin(api, getContainer())
    })

    const address = { first_name: "Asha", last_name: "Rao", address_1: "12 MG Road", city: "Pune", postal_code: "411001", country_code: "in", phone: "+91 98765 43210" }

    /** A cart for 2 x Rs 1,499.50 plus Rs 50 delivery (Rs 3,049), with a Razorpay payment session. */
    async function checkoutToPayment() {
      const cart = (await api.post("/store/carts", { region_id: regionId, email: "asha@example.com" }, store)).data.cart
      await api.post(`/store/carts/${cart.id}/line-items`, { variant_id: variantId, quantity: 2 }, store)
      await api.post(`/store/carts/${cart.id}`, { shipping_address: address, billing_address: address }, store)
      const options = (await api.get(`/store/shipping-options?cart_id=${cart.id}`, store)).data.shipping_options
      await api.post(`/store/carts/${cart.id}/shipping-methods`, { option_id: options[0].id }, store)
      const collection = (await api.post("/store/payment-collections", { cart_id: cart.id }, store)).data.payment_collection
      const session = (
        await api.post(`/store/payment-collections/${collection.id}/payment-sessions`, { provider_id: "pp_razorpay_razorpay" }, store)
      ).data.payment_collection.payment_sessions[0]
      return { cartId: cart.id as string, session }
    }

    const record = (cartId: string, orderId: string, paymentId: string, signature = signPayment(orderId, paymentId, KEY_SECRET)) =>
      api.post("/store/razorpay/payments", { cart_id: cartId, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature }, store)

    const webhook = (body: Record<string, unknown>, eventId: string, secret = WEBHOOK_SECRET) => {
      const raw = JSON.stringify(body)
      return api.post("/hooks/razorpay", raw, {
        headers: { "content-type": "application/json", "x-razorpay-signature": signWebhookBody(raw, secret), "x-razorpay-event-id": eventId },
      })
    }

    async function orderPayment(orderId: string) {
      const query = getContainer().resolve(ContainerRegistrationKeys.QUERY)
      const {
        data: [order],
      } = await query.graph({
        entity: "order",
        fields: ["id", "total", "payment_collections.status", "payment_collections.payments.id", "payment_collections.payments.amount", "payment_collections.payments.captured_at", "payment_collections.payments.data"],
        filters: { id: orderId },
      })
      return order as any
    }

    describe("checkout", () => {
      it("creates a Razorpay order for the cart total in paise, places the order and records the capture", async () => {
        const { cartId, session } = await checkoutToPayment()
        // 2 x 1499.50 + 50 = 3049 rupees = 304900 paise, created once, server side.
        expect(session.data).toMatchObject({ amount: 304900, currency: "INR", key_id: KEY_ID, session_id: session.id })
        expect(session.data).not.toHaveProperty("key_secret")
        const order = razorpay.orders.get(session.data.razorpay_order_id)!
        expect(order).toMatchObject({ amount: 304900, currency: "INR", receipt: session.id })

        const payment = razorpay.pay(order.id)
        expect((await record(cartId, order.id, payment.id)).data).toEqual({ status: "verified" })

        const done = await api.post(`/store/carts/${cartId}/complete`, {}, store)
        expect(done.data.type).toBe("order")
        const placed = await orderPayment(done.data.order.id)
        expect(Number(placed.total)).toBe(3049)
        const medusaPayment = placed.payment_collections[0].payments[0]
        expect(Number(medusaPayment.amount)).toBe(3049)
        expect(medusaPayment.captured_at).toBeTruthy()
        expect(medusaPayment.data).toMatchObject({ razorpay_payment_id: payment.id, razorpay_payment_status: "captured" })

        // Admin refunds Rs 100.50: Razorpay gets 10050 paise.
        await api.post(`/admin/payments/${medusaPayment.id}/refund`, { amount: 100.5 }, admin)
        expect(razorpay.refunds).toEqual([expect.objectContaining({ payment_id: payment.id, amount: 10050 })])
      })

      it("captures an authorised payment from Admin", async () => {
        const { cartId, session } = await checkoutToPayment()
        const payment = razorpay.pay(session.data.razorpay_order_id, { status: "authorized" })
        await record(cartId, payment.order_id, payment.id)
        const done = await api.post(`/store/carts/${cartId}/complete`, {}, store)
        const medusaPayment = (await orderPayment(done.data.order.id)).payment_collections[0].payments[0]
        expect(medusaPayment.captured_at).toBeFalsy()

        await api.post(`/admin/payments/${medusaPayment.id}/capture`, {}, admin)
        expect(razorpay.payments.get(payment.id)!.status).toBe("captured")
        expect(razorpay.calls).toContain(`POST /payments/${payment.id}/capture`)
      })

      it("refuses a wrong signature, another order's payment, a short payment and an unpaid order", async () => {
        const { cartId, session } = await checkoutToPayment()
        const orderId = session.data.razorpay_order_id
        const payment = razorpay.pay(orderId)

        const forged = await failure(record(cartId, orderId, payment.id, signPayment(orderId, payment.id, "guessed_secret")))
        expect(forged.data).toMatchObject({ type: "not_allowed", message: expect.stringMatching(/could not verify/) })

        // A real, correctly signed payment for some other Razorpay order cannot pay for this cart.
        const other = razorpay.pay((await checkoutToPayment()).session.data.razorpay_order_id)
        const elsewhere = await failure(record(cartId, other.order_id, other.id))
        expect(elsewhere.data.message).toMatch(/different checkout/)

        // Razorpay says only Rs 1 was paid: the cart total on the server wins.
        const short = razorpay.pay(orderId, { amount: 100 })
        const shortRes = await failure(record(cartId, orderId, short.id))
        expect(shortRes.data.message).toMatch(/does not match the order total/)

        const failed = razorpay.pay(orderId, { status: "failed" })
        expect((await failure(record(cartId, orderId, failed.id))).data.message).toMatch(/not gone through/)

        // Completing without a verified payment does not place an order.
        const complete = await failure(api.post(`/store/carts/${cartId}/complete`, {}, store))
        expect(JSON.stringify(complete.data)).toMatch(/have not received your payment/)
      })

      it("starts a new Razorpay order when the cart total changes", async () => {
        const { cartId, session } = await checkoutToPayment()
        await api.post(`/store/carts/${cartId}/line-items`, { variant_id: variantId, quantity: 1 }, store)
        const cart = (await api.get(`/store/carts/${cartId}?fields=*payment_collection.payment_sessions`, store)).data.cart
        const sessions = cart.payment_collection?.payment_sessions ?? []
        // Medusa either drops the old session or updates it; either way no session keeps the old amount.
        for (const s of sessions) {
          expect(s.data?.razorpay_order_id === session.data.razorpay_order_id && s.data?.amount === 304900).toBe(false)
        }
        // And paying the old order cannot complete the new total.
        const stale = razorpay.pay(session.data.razorpay_order_id)
        expect((await failure(record(cartId, stale.order_id, stale.id))).status).toBe(400)
      })
    })

    describe("webhooks", () => {
      const capturedEvent = (paymentId: string, orderId: string, amount: number) => ({
        event: "payment.captured",
        payload: { payment: { entity: { id: paymentId, order_id: orderId, amount, currency: "INR", status: "captured" } } },
      })

      it("ignores unsigned and wrongly signed webhooks", async () => {
        const { session } = await checkoutToPayment()
        const payment = razorpay.pay(session.data.razorpay_order_id)
        const raw = JSON.stringify(capturedEvent(payment.id, payment.order_id, payment.amount))
        const unsigned = await failure(api.post("/hooks/razorpay", raw, { headers: { "content-type": "application/json" } }))
        expect(unsigned.status).toBe(400)
        const wrong = await failure(webhook(capturedEvent(payment.id, payment.order_id, payment.amount), "evt_wrong", "not_the_secret"))
        expect(wrong.status).toBe(400)
        // Nothing was looked up or placed.
        expect(razorpay.calls.filter((c) => c.includes(payment.id))).toEqual([])
        const orders = await getContainer().resolve(Modules.ORDER).listOrders({})
        expect(orders).toHaveLength(0)
      })

      it("places the order when the customer paid but never came back, and only once for a repeated event", async () => {
        const { cartId, session } = await checkoutToPayment()
        const payment = razorpay.pay(session.data.razorpay_order_id)
        const body = capturedEvent(payment.id, payment.order_id, payment.amount)

        const first = await webhook(body, "evt_paid_1")
        expect(first.data).toMatchObject({ status: "processed", result: expect.stringMatching(/payment captured: recorded/) })
        const orders = await getContainer().resolve(Modules.ORDER).listOrders({})
        expect(orders).toHaveLength(1)

        const again = await webhook(body, "evt_paid_1")
        expect(again.data).toEqual({ status: "duplicate" })
        expect(await getContainer().resolve(Modules.ORDER).listOrders({})).toHaveLength(1)

        // The browser coming back late finds the cart already completed.
        expect((await record(cartId, payment.order_id, payment.id)).data).toEqual({ status: "already_completed" })
      })

      it("flags a payment that matches no checkout instead of placing anything", async () => {
        const { session } = await checkoutToPayment()
        const payment = razorpay.pay(session.data.razorpay_order_id, { amount: 500 })
        const res = await webhook(capturedEvent(payment.id, payment.order_id, 500), "evt_short")
        expect(res.data.result).toMatch(/unmatched/)
        expect(await getContainer().resolve(Modules.ORDER).listOrders({})).toHaveLength(0)
      })

      it("notes failed payments and flags refunds made outside Medusa", async () => {
        const { session } = await checkoutToPayment()
        const failedRes = await webhook({ event: "payment.failed", payload: { payment: { entity: { id: "pay_x", error_description: "Card declined" } } } }, "evt_failed")
        expect(failedRes.data.result).toBe("payment failed: nothing to do")

        const payment = razorpay.pay(session.data.razorpay_order_id)
        const refund = { id: "rfnd_dashboard", payment_id: payment.id, amount: 1000, status: "processed" }
        const refundRes = await webhook({ event: "refund.processed", payload: { refund: { entity: refund } } }, "evt_refund")
        expect(refundRes.data.result).toBe("refund made outside Medusa: flagged")

        const other = await webhook({ event: "order.paid", payload: {} }, "evt_other")
        expect(other.data.result).toBe("ignored: order.paid")
      })
    })
  },
})
