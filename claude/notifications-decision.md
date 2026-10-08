# Email notifications: decisions

Date: 2026-10-08. Covers the first version of transactional email (commit "Add email notifications").

## How it is put together

```
workflow succeeds -> emits a domain event -> subscriber loads the records -> template renders -> sendEmail() -> notification module -> provider
```

- **Events.** The vet, Mates and insurance workflows now emit events with `emitEventStep`. The event names live next to each module (`src/modules/<module>/events.ts`). Medusa releases these events only after the workflow has succeeded, so an email can never be part of the booking, offer or lead transaction, and a failed email cannot roll anything back. Orders use Medusa's own `order.placed`.
- **Subscribers.** There is one file per event in `src/subscribers/`. Each loads what it needs and calls `sendEmail()` once per recipient, inside `runNotification()`, which catches and logs any error, including lookups of records that have since been deleted.
- **`sendEmail()`** (`src/notifications/send.ts`) never throws:
  - It checks the group's on/off setting and skips quietly when there is no address.
  - It calls `createNotifications` on Medusa's notification module.
  - It logs any failure and returns `false`.
- **Templates** are all in `src/notifications/templates/`: one shared layout plus `vet.ts`, `mates.ts`, `insurance.ts` and `orders.ts`. Each returns `{ subject, html, text }`. The HTML is plain and table-based with inline styles (email apps ignore stylesheets), max 560px wide with a viewport meta for phones, in Petzy teal `#1F6F6B` and coral `#FF6B4A`, in English. Every value people typed is HTML-escaped.
- **What is stored.** The notification module keeps a row per email (recipient, template, status). Our `data` on that row is only the resource type and id. The rendered content is passed to the provider but not stored by the module, so phone numbers do not end up in the `notification` table.
- **Duplicates.** Every send has an `idempotency_key` (template, record id, and for repeatable events the record's `updated_at`), so a re-delivered event does not send the same email twice.

## Providers

- **Log provider** (`src/modules/notification-log`) writes the recipient, template, subject and plain-text body to the server log. It replaces Medusa's built-in local provider for email, which dumps raw JSON with no subject.
- **Resend provider** (`src/modules/notification-resend`) calls Resend's REST API with `fetch`, with a 10-second timeout and no new npm package. The key only goes in the `Authorization` header; it is never logged or put in an error message.
- `medusa-config.ts` picks Resend when both `RESEND_API_KEY` and `NOTIFY_FROM_EMAIL` are set, and the log provider otherwise. Development therefore logs by default, because the template leaves both empty. Only one provider can own a channel, so this is an either/or choice made at startup.
- Medusa's default "feed" provider (channel `feed`) is kept, because the Admin notification feed uses it. Declaring the notification module replaces Medusa's default provider list, so it is listed explicitly.

## Settings

- `NOTIFY_VET`, `NOTIFY_MATES`, `NOTIFY_INSURANCE` and `NOTIFY_ORDERS` each switch one group. All are on by default; `false`, `0`, `off` or `no` switches a group off. They are read at send time.
- `ADMIN_NOTIFY_EMAIL` is the internal inbox for insurance leads. Without it, lead emails are skipped and logged.
- `STOREFRONT_URL` (default `http://localhost:8000/in`) is used for links in emails, including the country path.
- All of these, and the Resend variables, are in `.env.template`.

## Who gets what, and where we filled gaps in the brief

- **Vet**
  - Booking: the customer gets an email if they gave an address, and the clinic gets one at the provider's email.
  - Cancellation: both get an email when the status becomes `cancelled` (Admin is the only place that cancels). Other status changes, and saving notes on an already-cancelled appointment, send nothing.
  - The clinic's email includes the customer's phone, because the clinic needs it. The customer's email includes the clinic's phone, as the booking confirmation page already does. The "no phone numbers" rule in the brief sits under Mates, so it is applied to Mates emails.
- **Mates**
  - New offer: email to the seller.
  - Seller counters or rejects: email to the buyer.
  - Accepted, by either side: both sides get an email.
  - A buyer's message: email to the seller.
  - Admin approve or reject: email to the seller. Removal sends nothing.
  - **Added:** when an acceptance closes other buyers' live offers, those buyers get a short "the seller accepted another offer" email. Otherwise their offer would simply disappear.
  - **Not sent:** buyer counters, withdrawals, rejections by the buyer, the seller's own messages, and offers closed by mark-sold, Admin removal or expiry. The brief did not ask for them; these are easy to add in `src/subscribers/mates-offer-updated.ts` if wanted.
  - **Phone rule:**
    - Only the "offer accepted" email carries a phone number, and only the other person's: the seller gets the buyer's offer phone, the buyer gets the listing phone.
    - Text people type (listing titles, messages, rejection reasons) goes through `maskPhones()` in every Mates email, which replaces anything with 7 or more digits with "[number hidden]". Without it, a number typed into a message or a title would be emailed.
    - Prices and 6-digit PIN codes are untouched.
- **Insurance:** each new lead emails `ADMIN_NOTIFY_EMAIL` with all its details, phone included, because it goes to staff. The footer says not to forward it.
- **Orders:** a confirmation goes to the order email on `order.placed`. It lists items, totals in rupees, the delivery address and a link to the order in the customer's account.

## Failure handling

- **The rule:** a failed send never fails anything else. It holds three ways:
  - the events fire after the workflow commits;
  - `sendEmail()` catches everything;
  - `runNotification()` catches errors around it.
- **Tested** by making `createNotifications` reject. The booking still returns 201 and the appointment is saved.
- **Retries:** there are none. A failed email is logged ("Notification failed: ...") and its notification row is marked failed by the module. Add retries if Resend outages turn out to matter.

## SMS later

`src/notifications/send.ts` and `medusa-config.ts` say where SMS goes:
1. Add a provider module with `channels: ["sms"]` next to the email provider.
2. Give templates a short `sms` text.
3. Add a `sendSms()` that mirrors `sendEmail()` with a phone number as `to`.
4. Call it from the subscribers.

Nothing else changes. If we add SMS, the Mates phone rule needs a second look for SMS bodies.

## Tests

- **Unit** (`src/notifications/__tests__/`):
  - layout helpers (escaping, phone masking, IST time);
  - every template's content;
  - **every Mates email except "accepted" is free of both phone numbers**, even when the title and message contain them;
  - the accepted email shows only the other side's phone;
  - settings, and `sendEmail()` swallowing a provider failure and skipping when switched off or without an address.
- **Integration** (`integration-tests/http/notifications.spec.ts`, 11 tests) runs the real events through real subscribers and inspects what reaches the notification module:
  - vet booking, cancellation and no-email bookings;
  - a failing provider not failing the booking;
  - switching groups off;
  - the full Mates offer flow with phone checks, approve and reject, the seller rejecting, and buyer moves sending nothing;
  - insurance with and without an inbox;
  - an order confirmation from `order.placed`, emitted for an order created directly rather than through a full checkout.
- **Checking the checks:** putting the seller's phone into the "offer received" template made both the unit and integration tests fail, as they should.

## Not done

- SMS and WhatsApp.
- Verifying a sending domain in Resend before launch. Resend only delivers from verified domains, and without that every send fails and is logged.
- Retries and a "resend" button in Admin.
- An unsubscribe or preferences page. These are transactional emails, which is usually fine without one, but marketing emails would need it.
