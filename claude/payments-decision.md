# Razorpay payments: decisions

Date: 2026-10-12. Covers the first version of Razorpay payments, test mode only. Cash on Delivery, subscriptions and live mode are out of scope.

> **Status: tested against a mock only, not yet against real Razorpay.** Everything below passes unit tests and an integration test against a mock of Razorpay's API (see Tests). No real test-mode payment has been made yet, because no Razorpay test keys were available, so the browser checks in the brief (a successful payment, a failed payment, closing the popup, and the order in Admin) have not been done. The code went to `main` at the owner's request on 2026-10-12, and was left there on purpose. Without keys it stays switched off. Checked in the browser the same day: with no keys the India region offers only the existing manual payment, there is no "Pay online" option, and a full checkout with the manual payment places the order. Before relying on Razorpay, add test keys, run `npm run setup:razorpay`, and do the README's test-mode steps end to end.

## Shape

- **Provider module:** `backend/apps/backend/src/modules/razorpay` is a Medusa v2 payment provider (`AbstractPaymentProvider`). It is registered in `medusa-config.ts` with identifier `razorpay` and id `razorpay`, so its provider id is `pp_razorpay_razorpay`. It talks to Razorpay's REST API with `fetch` and HTTP basic auth (`lib/client.ts`), with no SDK and no new package.
- **When it loads:** only when `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are both set. Without them the store keeps Medusa's manual test provider and works as before.
- **Regions:** which regions offer it is region data, not config. `npm run setup:razorpay` adds Razorpay to every INR region and removes the manual provider (`pp_system_default`) there, so customers cannot place unpaid orders. It does this only when Razorpay is actually loaded, because otherwise the region would be left with no way to pay. `-- keep-manual` keeps the manual provider for development. Other regions are untouched. Medusa's system provider itself stays registered (Medusa always loads it).
- **Webhook events table:** `src/modules/razorpay-webhooks` is a tiny module with one table, `razorpay_webhook_event`, used to drop duplicate webhooks. It is the one new migration, `Migration20261012063750`.

## Money

- Medusa amounts are rupees (major units, possibly with decimals, as a number, a string or a BigNumber). Razorpay wants whole paise.
- `lib/money.ts` is the only place that converts: `toPaise()` and `fromPaise()`. It works on the decimal string with BigInt, so 1499.95 is 149995, never 149994.99. It rounds half up at the third decimal, because tax can leave more than two. It accepts every shape Medusa passes, including the raw `{ value, precision }` it uses for refunds, and refuses anything else rather than guessing.
- `fromPaise()` returns an exact string ("1499.50"), which Medusa accepts as an amount.
- Razorpay needs at least Rs 1, so smaller totals are refused at the payment step.

## The payment flow, and what is trusted

1. **Payment step.** The storefront starts a Medusa payment session. `initiatePayment` creates a Razorpay order for the session amount in paise, with the session id as the order's `receipt`. The session data keeps the Razorpay order id, the amount in paise and the public key id; the key secret is never stored there or sent to the browser.
2. **Review step.** "Pay ₹X securely" loads Checkout.js (only on this step) and opens it for that Razorpay order. The customer pays inside Razorpay's window.
3. **Checkout succeeds.** The browser posts `razorpay_order_id`, `razorpay_payment_id` and `razorpay_signature` to `POST /store/razorpay/payments`. That route trusts none of it. It checks:
   - the signature (HMAC-SHA256 of `order_id|payment_id` with the key secret, compared in constant time);
   - that the order is this cart's pending Razorpay session;
   - that the **cart total computed on the server**, converted to paise, equals the amount the Razorpay order was created for;
   - Razorpay's own record of the payment, fetched with our key: the right order, INR, exactly that amount, authorised or captured.

   Only then is the payment id saved on the session.
4. **Place order.** The storefront completes the cart. `authorizePayment` checks the signature and Razorpay's record again (a second, independent check at the moment that counts). It returns `captured` if Razorpay already captured the payment (auto-capture accounts) or `authorized` otherwise; Admin can then capture.
5. **Admin.** Capture (when not auto-captured) and refunds (full or partial) go through the provider; refunds are sent in paise. Razorpay has no way to void an authorised payment: one that is never captured is released by Razorpay automatically. So "cancel" only records the state, and refuses on a captured payment, saying to refund instead.
6. **Changed cart.** If the cart total changes after a session started, Medusa updates the session. `updatePayment` then creates a new Razorpay order for the new amount, unless a payment is already recorded, in which case it refuses. Paying an outdated order is refused by the verify route.

## Webhooks

- **One entry point.** Razorpay posts to our own route, `POST /hooks/razorpay`, not Medusa's generic `/hooks/payment/:provider`. The generic route queues the event before any signature check and has no duplicate protection, so the provider's `getWebhookActionAndData` deliberately answers "not supported".
- **Order of work:**
  1. Verify `X-Razorpay-Signature` against the **raw** body (kept with `preserveRawBody` on that route only) using `RAZORPAY_WEBHOOK_SECRET`. A missing or wrong signature, or no secret configured, answers 400 and nothing else happens.
  2. Claim the event id (`X-Razorpay-Event-Id`, or a hash of the body if it is missing) in `razorpay_webhook_event`. The primary key makes a second delivery a no-op that answers 200 "duplicate".
  3. Act. If acting fails, the claim is released and the route answers 500 so Razorpay retries.
- **Events:**
  - `payment.authorized` and `payment.captured`: the route re-reads the payment from Razorpay rather than trusting the webhook body. It finds the session through the Razorpay order's receipt and checks that the order and amount match. It then runs Medusa's `processPaymentWorkflow`, which places the order if the customer paid but never came back (closed the tab, lost signal), or records the capture. A payment that matches no checkout (for example the cart changed while the customer paid) is not used to place anything; it is logged as an error for staff to refund.
  - `payment.failed`: noted in the log. The customer can retry, because the same Razorpay order accepts another attempt.
  - `refund.created` and `refund.processed`: refunds started in Admin are already recorded. One made directly in the Razorpay dashboard is logged as a warning so staff can record it on the order.
  - Anything else: ignored.

## Storefront

- The payment method is listed as "Pay online (UPI, cards, netbanking)".
- **Double-click guard:** the Pay button is disabled while busy, and a ref (not state) stops a second window opening.
- **Messages:**
  - Failed attempt: Razorpay's own reason, and the customer can retry in the same window.
  - Window closed without paying: "Payment cancelled. You have not been charged".
  - Verification refused: the API's message, and the customer can try again.
  - Paid, but the order could not be placed: a clear "please do not pay again" with a **Place order again** button. The webhook would also place it.
- **Callback state:** the Razorpay callbacks read the current stage from a ref, so closing the window right after paying is not mistaken for a cancellation.
- **Styling:** the window uses Petzy coral (`#FF6B4A`) as its theme colour and is prefilled with the customer's name, email and phone.

## Tests

- **Unit** (`src/modules/razorpay/__tests__/`):
  - rupee and paise conversion, including float traps, half-up rounding, BigNumber and raw shapes, and refusals;
  - signatures (valid, wrong, tampered, re-serialised body, missing parts), with the Checkout signature pinned to a value computed independently with `openssl`;
  - the duplicate guard (repeat, retry after a failure, two at once).
- **Integration** (`integration-tests/http/razorpay.spec.ts`, 8 tests) runs a real Medusa checkout against a mock Razorpay API (an in-process HTTP server that checks basic auth):
  - the Razorpay order is created in paise (2 × Rs 1,499.50 + Rs 50 delivery = 304900 paise);
  - verify, then complete: the order is placed and the payment captured;
  - an Admin partial refund of Rs 100.50 reaches Razorpay as 10050 paise;
  - an authorised payment is captured from Admin;
  - refusals: a forged signature, another order's payment, a short payment, a failed payment, and completing without paying;
  - a changed cart;
  - webhooks: unsigned or wrongly signed ones are ignored, a paid-but-abandoned checkout gets its order, a repeat event is handled once, an unmatched payment is flagged, and failed and outside refund events are noted.
- **Test keys** in the integration test are fake and set on `process.env` inside the test file. Tests never read the real `.env`.

## Not done

- Live mode: KYC, live keys, a live webhook URL, and a review of capture settings.
- Cash on Delivery, subscriptions, EMI, saved cards.
- An Admin screen for webhook history (the table exists; the log shows the outcome of each event).
