# Insurance referrals module: decisions

Date: 2026-10-08. Covers the first version of the insurance referral backend and Admin screen (commit "Add insurance referrals backend").

Petzy does not sell or underwrite insurance. It lists partner insurers' plans and passes interested customers to the partner as leads. The module is `backend/apps/backend/src/modules/insurance`, built like the vet and Mates modules: DML models, one workflow per change, zod validators for request shapes, Admin routes under `/admin/insurance`, and a React Admin page with tabs.

## Data

- Three tables: `insurance_partner`, `insurance_plan` (belongs to a partner) and `insurance_lead` (belongs to a plan). One migration, `Migration20261008065835`.
- Premiums and cover are whole rupees, as in vet and Mates. The plan's `annual_premium_from` is indicative: the partner quotes the real premium.
- `pet_types`, `highlights` and `exclusions` are Postgres text arrays. Validators allow up to 10 highlights and 10 exclusions of up to 120 characters each.
- Ages are whole months, 0 to 360, with `min_age_months` <= `max_age_months` (both inclusive). There is no "no upper limit" setting; use 360 for that.
- One column beyond the spec: `insurance_lead.phone_key`, the phone number reduced to its last 10 digits (all digits if shorter). It exists only for the daily limit and is indexed with `created_at`. The number as typed stays in `phone`.

## What customers see

- `GET /store/insurance/plans` lists active plans whose partner is also active, ordered by `sort_order`, then name. Deactivating a partner hides all of its plans at once without touching them.
- The filters `pet_type`, `pet_age_months` and `max_premium` run in memory on the active plans rather than in SQL. The catalogue is a handful of partners, and doing it this way keeps a single "does this plan cover this pet" rule (`utils/rules.ts`), shared with the lead check. Revisit if the catalogue ever grows to hundreds of plans.
- Responses go through an allow-list serializer. The partner appears as name, logo and website only. Contact email, contact phone and notes stay in Admin, and a test checks they never reach the store.
- Logo and website links must be `http(s)`. zod's `url()` alone accepts `javascript:` links, and these links will be rendered on the website.

## Leads

- Guests can send leads; no account is needed. Required: `plan_id`, `customer_name`, `phone`, `pet_type`, `pet_age_months`. Optional: email, pet name, breed, city, PIN code, message. Name, type and age are required because a partner cannot quote without them, and the type and age are needed for the plan check.
- The plan and its partner must be active (otherwise 404, "not available right now").
- The pet must fit the plan, or the request is refused with `NOT_ALLOWED` and a sentence the website can show as is, for example "Complete Care covers dogs and cats only." or "Complete Care covers pets aged 3 months to 8 years. Your pet is 9 years."
- The reply is a receipt only (lead id, status, plan and partner name). The customer's own details and staff notes are not echoed back.
- Lead statuses: new, contacted, sent_to_partner, converted, closed. Any status can follow any other, so a slip is easy to undo.

## Daily limit

- At most **3 leads per phone number in 24 hours**, across all plans. Refusals use `NOT_ALLOWED`, like the other rules (HTTP 400, not 429).
- "Per day" means the last 24 hours, not the calendar day, so midnight does not reset it.
- Numbers are compared by their last 10 digits, so `+91 98111 22333`, `098111-22333` and `9811122333` are one number. Without this, adding a space would get around the limit.
- The count and the insert run inside the Medusa locking module (`locking.execute("insurance-lead:<phone_key>")`), so parallel requests cannot slip past the limit; a test fires 6 at once and exactly 3 succeed. The default locking provider is in-memory, which is right for one backend process. With several backend instances, switch the locking module to its Redis provider, or the lock only holds within each instance.
- Requests refused for other reasons (wrong pet, inactive plan) do not count towards the limit.
- This is basic abuse protection, as asked. It does not stop someone cycling through many phone numbers; if that happens, add an IP-based limit or a captcha on the website form.

## Admin

- Admin > Insurance has tabs Partners, Plans and Leads. As on Mates, the selected tab is kept in the URL (`?tab=leads`), and the page does not render its own `<Toaster />`, because the dashboard has one.
- Deletes are permanent (hard deletes):
  - Deleting a partner deletes its plans and every lead sent for them.
  - Deleting a plan deletes its leads.
  - The confirmation shows the exact counts first ("its 2 plan(s) and the 1 customer lead(s)") and suggests deactivating to keep the leads. The API response returns the counts too.
- **CSV export** (`GET /admin/insurance/leads/export`):
  - It uses the same filters as the list (status, plan, partner, from/to dates in India time), newest first, up to 10,000 rows.
  - It starts with a UTF-8 byte order mark so Excel shows ₹ and Indian names correctly.
  - Cells are protected against spreadsheet formula injection, following OWASP: any cell starting with `=`, `+`, `-`, `@`, tab or carriage return gets a leading apostrophe. Leads are typed by the public and the file is opened by staff, so a name like `=HYPERLINK(...)` must not run. The cost is that phone numbers written as `+91 ...` appear as `'+91 ...` in the file.

## Seed data

- `npm run seed:insurance` adds "Example Pet Cover Co. (sample)" and "Demo Animal Health Insurance (sample)" with four plans. These are made-up names, not real insurers. Links point at example.com and the phone numbers are placeholders. It is safe to re-run.

## Tests

- **Unit** (`src/modules/insurance/__tests__/rules.unit.spec.ts`): phone keys, plan fit messages, the list filters, plan settings and CSV escaping.
- **HTTP** (`integration-tests/http/insurance.spec.ts`, 14 tests):
  - plan visibility and order, and every filter;
  - partner contact details never reaching the store;
  - the guest lead receipt, required fields, and the pet type and age rules with their exact messages;
  - inactive or unknown plans;
  - the daily limit: different spellings of a number, across plans, 6 parallel requests, the 24-hour window, and refusals not counting;
  - Admin plan checks, cascade deletes with counts, and lead status, notes and delete;
  - the CSV export, including formula escaping and filters.

## Website (added 2026-10-12)

- Pages live under `/[countryCode]/insurance` (the list) and `/[countryCode]/insurance/:id` (one plan), in `backend/apps/storefront/src/modules/insurance`. Data calls are server actions in `lib/data/insurance.ts` that return `{ data }` or `{ error }`, so the API's own messages reach the page in production.
- **Disclaimer.** "Insurance is offered by our partners. Petzy does not sell or underwrite insurance." is the first thing on both pages, in a highlighted box.
- **Filters** use the API's names in the URL (`pet_type`, `pet_age_months`, `max_premium`), so a filtered list can be shared and is rendered on the server. Age is typed as years plus months and sent as months. On a phone the filters fold behind a "Filters" button. With no results, the page shows "No plans match, try different filters" and a link to clear them.
- **Plan cards** show the partner's logo (or its initials when there is none), the partner's and plan's names, "from Rs X a year", the cover amount, the first three highlights, and the pets and ages covered. Logos are a plain `<img>`, because Admin can enter a logo link on any https host, which `next/image` would need allowed one host at a time.
- **Carrying the filter over.** Opening a plan from a filtered list carries the pet type and age into the quote form, so the customer does not type them twice.

### The quote form

- **Pet type** offers only the types the plan covers.
- **Required:** name, phone, pet name, pet type, pet age and city. **Optional:** email, breed, PIN code and message. The API itself requires less (pet name and city are optional there); the form asks for both because a partner needs them to quote.
- **Consent:** a required checkbox: "I agree that Petzy may share these details with {partner} so they can contact me about this plan. See our Privacy Policy." The browser refuses to submit without it, and the submit handler checks again. A code comment marks the wording as a placeholder needing a lawyer's review (DPDP Act) before launch.
- **The Privacy Policy link** points at `/content/privacy-policy`, the same address the account sign-up form already uses. **That page does not exist yet**, so the link is a 404 until it is written. It opens in a new tab, so the form is not lost.
- **The form is uncontrolled.** After an error everything the customer typed stays, including the ticked box. Errors show the API's message as it comes, for example "Complete Care (sample) covers pets aged 3 months to 8 years. Your pet is 9 years." or "You have already sent 3 requests in the last 24 hours from this phone number. Please try again tomorrow."
- **The confirmation** names the partner and the plan and says the partner will contact them. It makes no promise about timing.
- **Shared component.** The `Notice` component used for error, empty and success boxes moved from the Mates module to `modules/common/components/notice`, now that two modules use it.

### Checked in a browser (phone size)

- the filters, including an empty result;
- opening a plan with the age carried over;
- submitting without consent (blocked, nothing sent);
- a valid quote;
- an age the plan does not cover;
- a 4th lead from the same phone (refused);
- the three test leads in Admin > Insurance > Leads, deleted afterwards;
- the desktop nav link and the mobile menu.

No layout overflowed sideways and no page errors appeared.

## Not done

- **Consent is not stored with the lead.** The checkbox only gates the form; the lead record has no consent field. For DPDP it is likely we must be able to show when and to what wording each customer agreed. Adding `consent_text` and `consent_at` to `insurance_lead` is a small change (a new migration) and is worth doing before launch.
- The Privacy Policy page itself, and a lawyer's review of the consent wording.
- Mobile app screens.
- Sending leads to partners automatically (email or a partner API). Today staff export a CSV or contact the partner by hand and mark the lead "Sent to partner".
- Retention: leads are kept until someone deletes them. Decide how long to keep closed leads.
- An IP-based limit or captcha, if the per-phone limit turns out not to be enough.
