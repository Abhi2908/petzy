# Mates module: decisions

Date: 2026-10-07. Covers the first version of the Mates marketplace backend and Admin screen (commit "Add Mates marketplace backend").

Mates is a custom Medusa module (`backend/apps/backend/src/modules/mates`) built the same way as the vet module: DML models, one workflow per state change, zod validators for request shapes, Admin routes under `/admin/mates`, and a React Admin page with tabs.

## Data

- Four tables: `mates_listing`, `mates_offer`, `mates_message`, `mates_report`. One migration, `Migration20261007065100`.
- `seller_customer_id`, `buyer_customer_id` and `reporter_customer_id` are plain text, not module links. A link would let `query.graph` join customers, which nothing needs yet, and plain ids keep the module self-contained.
- Prices and amounts are whole rupees (integers), like the vet consultation fee.
- `image_urls` is a Postgres text array.
- Two partial unique indexes back up the offer rules in the database, so a race cannot break them:
  - one live offer (`open` or `countered`) per buyer per listing;
  - one `accepted` offer per listing.

## Phone privacy

- `seller_phone` lives on the listing. `buyer_phone` lives on the offer and comes only from the "make an offer" request, never from the customer profile. A test gives the buyer a different profile phone and checks it never shows up.
- Every store response goes through allow-list serializers in `modules/mates/utils/serialize.ts`. A new column cannot leak by being added to a model.
- The phones are shown in two places only:
  - an **accepted** offer, read by one of its two sides: the seller sees `buyer_phone`, the buyer sees `seller_phone`, and each side gets only the other's number;
  - the owner's two read routes, `GET /store/mates/my/listings` and `GET /store/mates/my/listings/:id`, which return the caller's own listings with their `seller_phone` (serializer `ownListingWithPhone`). The list got it on 2026-10-07 and the single read on 2026-10-08, so the edit form can show the phone the seller entered.
- Every other listing response leaves `seller_phone` out, including the owner's write responses (create, edit, sold, release), public listings, offers before acceptance and other customers' lists. Another customer asking for someone else's listing on the owner route gets 404. Integration tests check both reads show it and all of those responses do not.
- Customer ids are left out of store responses too (`your_side` tells a customer which side they are on).
- Once an offer leaves `accepted` (the seller releases the listing, or Admin removes it), the phones stop being shown again.
- Admin routes return full records, phones included.
- Message bodies are not scanned for phone numbers. People can type their number into a message themselves; the rule is about what the API reveals on its own.

## Offer rules: where the spec needed a reading

- The spec says "only the side whose turn it is can accept, reject or counter" and also "either side can withdraw or reject while the offer is live". We read it as: **accept and counter** belong to the side whose turn it is; **reject and withdraw** are open to either side at any time while the offer is live. The more specific sentence wins for reject.
- Countering flips the turn: seller counter -> `countered` (buyer's move), buyer counter -> `open` (seller's move). The amount must be a whole number above 0.
- **Firm-price listings** (`price_negotiable` false), changed on 2026-10-08: they take offers too, but only with `amount` exactly equal to the listing price, so an offer there means "I will buy at your price". Counters are refused on them (from either side), so the seller can only accept or reject, and the buyer can withdraw. Negotiable listings keep the old rules. The other offer rules (active listing, not your own, one live offer per buyer, amount above 0) apply to both. A firm listing priced at 0 cannot take offers, because amounts must be above 0.
- If a seller edits a firm listing's price while an offer at the old price is open, that offer keeps its amount. The seller can still accept or reject it after the edit is approved.
- Accept and counter need the listing to be `active`. While a listing is back in review after an edit, its offers stay live but frozen; reject and withdraw still work.
- Accepting reserves the listing first, with a conditional update ("only if still active"), then accepts the offer, then rejects the other live offers. Two accepts at the same moment cannot both win; a test fires two in parallel.
- Other state changes use the same conditional updates, so a stale screen gets "This offer just changed" instead of overwriting someone else's move.
- Messages can be posted while an offer is live or accepted, and not after it is rejected or withdrawn. Only the buyer and the seller can read or post.

## Listing statuses

| From | Action | To | Notes |
|---|---|---|---|
| (new) | seller posts | `pending_review` | The request cannot set a status. |
| `pending_review` | Admin approves | `active` | `expires_at` = approval + 60 days. |
| `pending_review` | Admin rejects | `rejected` | The reason is shown to the seller. |
| `active`, `rejected`, `pending_review` | seller edits | `pending_review` | Clears the rejection reason. |
| `reserved`, `sold`, `expired`, `removed` | seller edits | refused | These listings are closed. |
| `active` | an offer is accepted | `reserved` | Other live offers are rejected. |
| `reserved` | seller releases | `active` | The accepted offer becomes `withdrawn`. |
| `active`, `reserved` | seller marks sold | `sold` | Live offers are rejected; an accepted one stays accepted. |
| `active`, past `expires_at` | `npm run expire:mates` | `expired` | Live offers are rejected. |
| any but `removed` | Admin removes | `removed` | All offers close; an accepted one is withdrawn, so phones stop showing. |
| any | seller or Admin deletes | gone | Hard delete with offers, messages and reports. |

- Public routes show only `active` listings that have not passed `expires_at`. That holds even before the expiry script runs.
- Reports can be filed on `active`, `reserved` and `sold` listings (ones a customer could have seen), not on your own, and one open report per customer per listing.
- Expiry is a script, as the spec asks, not a scheduled job. Turning it into a Medusa job later is a small change (`src/jobs`).

## Errors

- Business-rule failures use `MedusaError.Types.NOT_ALLOWED` (HTTP 400, `type: "not_allowed"`), never `CONFLICT`.
- Request shape errors (wrong type, missing field, unknown field) come from Medusa's zod validation as `invalid_data`, also 400. Customers cannot send fields outside the schema, such as `status`.
- Another customer's listing or offer answers `NOT_FOUND`, the same as a missing one, so ids cannot be probed.

## Photo uploads

- `POST /store/mates/uploads` takes one file per request in the multipart field `file` and returns `{ url }`.
- `multer` (already in the tree through `@medusajs/medusa`, now a direct dependency of the backend) reads it into memory with a 5 MB limit. It stops reading as soon as the file passes the limit, so the check happens while the upload arrives.
- The type comes from the file's magic bytes (JPEG, PNG, WebP). The name and Content-Type the browser sent are ignored, and the stored file gets a generated name (`mates-<uuid>.<ext>`), so a hostile file name cannot do anything.
- Storage goes through Medusa's file module (`uploadFilesWorkflow`). `medusa-config.ts` declares the local provider explicitly; moving to Cloudflare R2 means swapping it for `@medusajs/medusa/file-s3` with the R2 endpoint. `static/` is now in `.gitignore`.
- Uploaded photos that never end up in a listing are not cleaned up yet. Worth a periodic job once R2 is in place.

## Admin

- Admin > Mates has tabs Listings, Reports and Offers (read only).
- The selected tab is kept in the URL (`?tab=reports`) and both the tab highlight and the content read that one value. While checking this, the vet page's tabs were confirmed to work too: an earlier screenshot that seemed to show a stuck highlight had been taken during the tab's colour transition.

## Tests

- Unit (`src/modules/mates/__tests__/*.unit.spec.ts`): turn rules, offer checks, listing rules, magic-byte detection, and the serializers' phone privacy.
- HTTP (`integration-tests/http/mates.spec.ts`, 22 tests): registers a seller, a buyer and a third customer through `/auth/customer/emailpass/register`, `/store/customers` and login, plus an admin. Covers status changes, offer rules, a parallel double accept, participants-only messages, reports, phone privacy before and after acceptance from each side, and the upload checks (fake image, wrong field, two files, over 5 MB, anonymous).
- The privacy tests were checked by putting `seller_phone` back into the public serializer: both privacy tests failed, as they should.

## Storefront (website)

- Pages under `/[countryCode]/mates`: browse, listing, `new`, `my` (listings), `my/offers`, `my/offers/:id`, `my/listings/:id/edit`. Data calls are server actions in `lib/data/mates.ts` that return `{ data }` or `{ error }`, so the API's own messages reach the screen (Next.js hides thrown server action errors in production).
- Photo uploads go through a route handler, `app/api/mates/uploads`, not a server action: server actions cap bodies at 1 MB, and the browser cannot attach the customer's token itself (it is an httpOnly cookie). The handler streams the body to the backend, so the 5 MB limit and the magic-byte check still happen there; the browser checks type and size first only to answer faster.
- Browse filters live in the URL, so a filtered search can be shared and is rendered on the server.
- Offer buttons appear only when it is the customer's turn: the seller sees Accept, Counter, Reject on an open offer; the buyer sees Accept, Counter, Withdraw on a counter. Counter is hidden on firm-price listings.
- While an offer waits on the other side, a "Withdraw offer" link (with a confirm step) lets either side end it: the buyer takes back an unanswered offer, the seller ends a negotiation the buyer has not answered.
- Firm-price listings show "Buy at ₹X": the form only asks for the buyer's phone and an optional message, and sends the listing price as the amount.
- The buyer types their phone into the offer form; it is not pre-filled from the profile.
- Sign-in prompts (and the report link's "sign in") link to `/account?return_to=<current page>`. The login and register forms pass it on, and the `login` / `signup` server actions redirect there after success. `lib/util/safe-return-path.ts` checks it on both sides: only a path on this site is accepted (it must start with a single `/`; `//host`, `/\host`, backslashes, control characters, full URLs and `javascript:` are rejected, and so is the account page itself). Anything else is ignored and the customer stays on their account page. If the backend ever turns on email verification, the return is lost at that step: the customer signs in again from the verification page.

## Not done

- Mobile app screens. (Website screens: built, see the storefront section above.)
- Verifying breeder registration numbers with the issuing body. Admin reviews them by eye for now.
- Notifications (email or SMS) for new offers, counters and acceptance.
- Rate limits on offers, messages and uploads.
- Website: messages refresh on page load or with the Refresh link, not live.
- Moving photos to R2 also needs the R2 host in `images.remotePatterns` in the storefront's `next.config.js`.
