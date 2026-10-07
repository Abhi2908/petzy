# Petzy

Multi-pet commerce platform: customer web, iOS, Android and an Admin Portal, all on **one backend and one database**.

```
petzy/
├── docker-compose.yml          PostgreSQL + pgAdmin (the database and its visual UI)
├── scripts/sync-keys.sh        copies this database's API key into the web + mobile configs
├── backend/                    Medusa.js monorepo
│   └── apps/
│       ├── backend/            Medusa API + Admin Portal   -> http://localhost:9000  (Admin at /app)
│       └── storefront/         Customer web (Next.js)      -> http://localhost:8000
└── mobile/                     iOS + Android app (Expo / React Native)
```

| What | URL / port | Login |
|---|---|---|
| Admin Portal | http://localhost:9000/app | `admin@petzy.com` / `Petzy@Admin123` (you create it in Step 4) |
| Customer web | http://localhost:8000 | customers sign up themselves |
| Backend API | http://localhost:9000 | health check: http://localhost:9000/health |
| pgAdmin (DB UI) | http://localhost:5050 | no login; DB password is `petzy_dev_pw` |
| PostgreSQL | localhost:5432 | user `petzy`, password `petzy_dev_pw`, database `petzy` |

> These are **local development** credentials. Change every secret before anything is deployed.

---

## How it fits together (why Admin changes show up everywhere)

Web, iOS and Android do not keep their own copies of your data. They all call the same Medusa Store API, which reads the same PostgreSQL database that the Admin Portal writes to.

- **Add or edit** a product in Admin: it appears on web and in the mobile app the next time they load (refresh the page / pull down to refresh in the app).
- **Delete** a product in Admin: it disappears from Admin, web, iOS and Android immediately. **Medusa only hides it** (the row stays in the database with `deleted_at` set, so it can be restored). To remove those rows permanently, run `npm run purge-deleted` (see [Permanent deletes](#permanent-deletes)).

---

## Prerequisites (install once, on your Mac)

1. **Node.js 22.22 or newer** – check with `node -v` (install from https://nodejs.org or `brew install node`).
2. **Docker Desktop** – https://www.docker.com/products/docker-desktop (runs Postgres + pgAdmin). No Docker? See the Homebrew alternative in Step 1.
3. **Xcode** (App Store) with an iOS Simulator – for the iPhone app.
4. **Android Studio** with an emulator (AVD) created in Device Manager – for the Android app.
5. **Git** (comes with Xcode command line tools).

---

## Step 1 – Start the database and the DB UI (pgAdmin)

From the `petzy/` folder:

```bash
docker compose up -d
```

First run downloads the images (a few minutes). Check both are running:

```bash
docker compose ps
```

Open **http://localhost:5050** – pgAdmin loads with a server called **Petzy (local)** already registered. The first time you expand it, pgAdmin asks for a password: enter `petzy_dev_pw` and tick *Save password*.

Browse your data: **Petzy (local) > Databases > petzy > Schemas > public > Tables**. Right-click a table (for example `product`) > **View/Edit Data > All Rows**.

<details>
<summary>No Docker? Use Homebrew Postgres + the pgAdmin desktop app instead</summary>

```bash
brew install postgresql@16
brew services start postgresql@16
createuser -s petzy
psql -d postgres -c "ALTER USER petzy WITH PASSWORD 'petzy_dev_pw';"
createdb -O petzy petzy
```

Then in the pgAdmin desktop app: **Register > Server** with Host `localhost`, Port `5432`, Maintenance database `petzy`, Username `petzy`, Password `petzy_dev_pw`.
</details>

Stop it later with `docker compose down` (data is kept). `docker compose down -v` also **deletes all data**.

---

## Step 2 – Install the backend + web dependencies

```bash
cd backend
npm install
```

This one install covers both the backend and the web storefront (takes a few minutes).

## Step 3 – Create the backend env file

```bash
cd apps/backend
cp .env.template .env
```

The template already points at the Docker database from Step 1. Nothing to edit for local development.

## Step 4 – Create the tables, demo data and your admin login

Still in `backend/apps/backend`:

```bash
npx medusa db:migrate
npx medusa user -e admin@petzy.com -p 'Petzy@Admin123'
```

`db:migrate` creates every table and loads Medusa's starter data (a Europe region, demo clothing products and the API key the apps use). Step 7 replaces that demo data with Petzy's own. Refresh pgAdmin to see the new tables.

## Step 5 – Give the web and mobile apps their API key

Every database generates its own API key. This script reads it and writes it into both apps. From the `petzy/` folder:

```bash
cd ../../..
./scripts/sync-keys.sh
```

You should see `Publishable key synced to storefront/.env.local and mobile/.env`. Run it again any time you reset the database.

---

## Step 6 – Run the backend and Admin Portal

```bash
cd backend/apps/backend
npm run dev
```

Wait for `Server is ready on port: 9000`. Then:

- Admin Portal: **http://localhost:9000/app** – sign in with `admin@petzy.com` / `Petzy@Admin123`
- Health check: http://localhost:9000/health should say `OK`

Leave this terminal running.

## Step 7 – Load the Petzy shop data (India, INR, categories, sample products)

The backend must have been started once (Step 6) before this works, because the product search index is switched on at first boot. Open a **new terminal**:

```bash
cd petzy/backend/apps/backend
npm run seed:petzy
```

This sets up, and is safe to re-run (anything that exists is skipped):

- **India region with INR** as the default currency, plus an India tax region (no GST rates yet).
- The 8 shop categories from the wireframes, including **Grooming**.
- 6 sample products priced in rupees with stock levels, matching the Admin wireframes.
- A placeholder warehouse and a flat Rs 50 "Standard Delivery (India)" option.
- It removes Medusa's demo clothing products and categories (soft delete; run `npm run purge-deleted` to erase them for good).

If you see `The product search index is not ready yet`, the backend has not finished its first start: wait for `Server is ready`, then run it again.

**Placeholders to replace later:** warehouse name and address, the Rs 50 shipping price, and GST rates (confirm with your CA).

### Step 7b – Vet appointments (new tables and sample vets)

The vet appointments feature adds three database tables. Create them, then restart the backend:

```bash
cd backend/apps/backend
npx medusa db:migrate        # creates vet_provider, vet_working_hour, vet_appointment
# restart the backend (Ctrl+C, then npm run dev), and in a second terminal:
npm run seed:vet             # optional: 3 SAMPLE vets with weekly hours (safe to re-run)
```

Then open Admin at http://localhost:9000/app and click **Vet Providers** in the left menu:

- **Providers tab:** add, edit and delete vets and clinics, set the consultation fee (paid at the clinic), the appointment length (15 to 60 minutes) and the weekly working hours (India time, several shifts per day allowed). Delete is **permanent** (the vet, their hours and their appointment history are removed from the database). It is refused while the vet still has upcoming appointments: cancel those first, or set the vet to Inactive.
- **Appointments tab:** filter by vet, status and dates; click a row to confirm, complete, cancel or mark no-show, and to add internal notes. Cancelling frees the slot.

How booking works: a customer picks a vet, a date and one of the open slots. A slot can only be booked once; if two people choose it at the same moment, one gets a clear "just booked" message. Past times and times outside working hours are refused.

Customer-facing endpoints (these need the publishable key header, like the rest of the store API):

```
GET  /store/vet/providers                          active vets
GET  /store/vet/providers/:id/slots?date=YYYY-MM-DD   open slots for that day (India date, up to 60 days ahead)
POST /store/vet/appointments                       book a slot (guests allowed, pay at the clinic)
```

The website booking page is at http://localhost:8000/in/vet ("Vet" in the menu). The mobile app screen is not built yet; it will call the same endpoints.

### Step 7c – Mates marketplace (new tables and sample listings)

Mates is the pet marketplace: customers post listings (like OLX) and buyers negotiate with offers. It adds four tables. Create them, then restart the backend:

```bash
cd backend/apps/backend
npx medusa db:migrate        # creates mates_listing, mates_offer, mates_message, mates_report
# restart the backend (Ctrl+C, then npm run dev), and in a second terminal:
npm run seed:mates           # optional: 5 SAMPLE listings, already approved (safe to re-run)
```

Then open Admin at http://localhost:9000/app and click **Mates** in the left menu:

- **Listings tab:** new and edited listings wait here as "Waiting for review". Click one to see everything (photos, seller phone, offers, reports) and **Approve** it (it goes live for 60 days) or **Reject** it with a reason the seller sees. **Remove** hides a listing and closes its offers but keeps the record. **Delete** is **permanent**: the listing, its offers, their messages and its reports are erased.
- **Reports tab:** what customers reported, with Resolve / Reopen.
- **Offers tab:** read only. Every offer with both phone numbers and the message thread. Admin is the only place phone numbers are shown freely.

How it works:

- A customer must be logged in to post, offer, message, report or upload. Browsing is public.
- Dog listings need a breeder registration number. Up to 8 photos per listing.
- Editing a listing sends it back to review (an active listing disappears until approved again).
- Offers take turns: the seller answers an open offer (accept, reject or counter), the buyer answers a counter. Either side can reject or withdraw while it is still open. A buyer has one open offer per listing.
- Accepting reserves the listing and rejects the other offers. Only then does each side see the other's phone number: the seller sees the phone the buyer typed into that offer, the buyer sees the seller's listing phone. Phone numbers never appear in listings, other offers, messages or reports.
- If the deal falls through, the seller can **release** the listing: it goes back on sale and the accepted offer is withdrawn (the phone numbers stop showing).
- Listings expire 60 days after approval. They drop out of the marketplace on time; run `npm run expire:mates` (for example daily from cron) to set their status to expired and close their offers.

Photos are stored with Medusa's file module, on local disk for now (`backend/apps/backend/static`, not committed). To move to Cloudflare R2, change the file provider in `medusa-config.ts` to `@medusajs/medusa/file-s3` with the R2 endpoint, bucket and keys; no code changes.

Customer-facing endpoints (publishable key header as usual; "login" means the Medusa customer session or bearer token):

```
GET    /store/mates/listings                       public: active listings (pet_type, breed, city, gender, min_price, max_price,
                                                   sort=newest|price_asc|price_desc, limit, offset)
GET    /store/mates/listings/:id                   public: one active listing
POST   /store/mates/listings                       login: post a listing (waits for review)
POST   /store/mates/uploads                        login: one photo (form field "file"; jpg, png or webp, up to 5 MB) -> { url }
GET    /store/mates/my/listings                    login: my listings, any status
GET    /store/mates/my/listings/:id                login: one of mine
POST   /store/mates/my/listings/:id                login: edit (back to review)
DELETE /store/mates/my/listings/:id                login: delete permanently
POST   /store/mates/my/listings/:id/sold           login: mark sold
POST   /store/mates/my/listings/:id/release        login: put a reserved listing back on sale
POST   /store/mates/listings/:id/offers            login: make an offer { amount, buyer_phone }
GET    /store/mates/my/offers                      login: offers I made
GET    /store/mates/my/received-offers             login: offers on my listings (listing_id, status)
GET    /store/mates/offers/:id                     login, buyer or seller of that offer
POST   /store/mates/offers/:id/accept | reject | withdraw
POST   /store/mates/offers/:id/counter             { amount }
GET    /store/mates/offers/:id/messages            buyer or seller only
POST   /store/mates/offers/:id/messages            { body }
POST   /store/mates/listings/:id/report            login: { reason }
```

The website and mobile screens for Mates are not built yet; they will call these endpoints. The reasoning behind the main choices is in `claude/mates-module-decision.md`.

Tests: `npm run test:unit` needs nothing. The HTTP tests create a throwaway database, so they need your Postgres login in `DB_USERNAME`, `DB_PASSWORD` and `DB_HOST` (the same user and password as in `DATABASE_URL`), for example `DB_USERNAME=petzy DB_PASSWORD=petzy_dev_pw DB_HOST=localhost npm run test:integration:http`.

## Step 8 – Run the customer website

Open a **new terminal**:

```bash
cd petzy/backend/apps/storefront
npm run dev
```

Open **http://localhost:8000**. The shop opens in India (INR); the catalog is at http://localhost:8000/in/store.

If you set up before this step existed, open `backend/apps/storefront/.env.local` and make sure it says `NEXT_PUBLIC_DEFAULT_REGION=in` (not `dk`), then restart the website.

**Try the full loop:** in Admin go to **Products > Create**, add a product, set it to *Published*, add it to the default sales channel, then refresh the website. It's there.

## Step 9 – Run the mobile app on the iOS Simulator

Open a **new terminal**:

```bash
cd petzy/mobile
npm install        # first time only
npm run ios
```

Expo starts, opens the iOS Simulator and installs Expo Go automatically. You should see the Petzy header and the same products as the website. Pull down on the list to refresh.

## Step 10 – Run the mobile app on the Android emulator

1. Open **Android Studio > Device Manager** and start an emulator (leave it running).
2. In a terminal:

```bash
cd petzy/mobile
npm run android
```

The Android emulator can't use `localhost` for your Mac, so the app automatically uses `http://10.0.2.2:9000` there (already handled in `mobile/src/config.ts`).

### Using a real phone instead

1. Put the phone and your Mac on the same Wi-Fi.
2. Find your Mac's IP: `ipconfig getifaddr en0` (for example `192.168.1.10`).
3. In `mobile/.env` add: `EXPO_PUBLIC_API_URL=http://192.168.1.10:9000`
4. Install **Expo Go** from the App Store / Play Store, run `npm start` in `mobile/` and scan the QR code.

---

## Daily routine (after the first-time setup)

```bash
docker compose up -d                                  # database + pgAdmin
cd backend/apps/backend && npm run dev                # terminal 1: API + Admin
cd backend/apps/storefront && npm run dev             # terminal 2: website
cd mobile && npm run ios        # or: npm run android   # terminal 3: app
```

## Permanent deletes

```bash
cd backend/apps/backend
npm run purge-deleted -- dry-run   # list what would be removed
npm run purge-deleted              # permanently delete soft-deleted products from the database
```

Run it whenever you want Admin deletes to be gone from the database for good. This cannot be undone.

## Resetting everything

```bash
docker compose down -v            # deletes the database
docker compose up -d
cd backend/apps/backend && npx medusa db:migrate && npx medusa user -e admin@petzy.com -p 'Petzy@Admin123'
cd ../../.. && ./scripts/sync-keys.sh
cd backend/apps/backend && npm run dev     # wait for "Server is ready", then in a second terminal:
npm run seed:petzy                         # (from backend/apps/backend) loads the Petzy shop data again
npm run seed:vet                           # optional sample vets
npm run seed:mates                         # optional sample Mates listings
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `ECONNREFUSED 5432` / backend can't connect | Database isn't running: `docker compose up -d`, then `docker compose ps`. |
| Port 5432 already in use | A local Postgres is running. Stop it (`brew services stop postgresql@16`) or change the left side of `"5432:5432"` in `docker-compose.yml` and in `DATABASE_URL`. |
| Website shows no products or "publishable key" errors | Run `./scripts/sync-keys.sh`, then restart `npm run dev` in the storefront. |
| Mobile app shows "Can't reach the Petzy API" | Backend not running, or wrong URL. The error shows which URL it tried; on a real phone set `EXPO_PUBLIC_API_URL`. |
| Products missing or out of date on the website after a seed or a script | The website lists products from a search index that only the running backend updates. Restart `npm run dev` in `backend/apps/backend`. |
| Prices are missing on the website | The currency must be in the search index. If you add a new currency, add it to `PRICE_CURRENCIES` in `backend/apps/backend/src/search/helpers/pricing.ts` and `SEARCH_PRICE_CURRENCIES` in `backend/apps/storefront/src/lib/search-client.ts`, then run `npx medusa db:migrate` and restart the backend. |
| `seed:petzy` says the search index is not ready | Start the backend once (Step 6), wait for `Server is ready`, run the seed again. |
| Admin login fails | Re-run `npx medusa user -e admin@petzy.com -p 'Petzy@Admin123'` in `backend/apps/backend`. |
| `Unsupported engine` on npm install | Upgrade Node to 22.22 or newer. |
| Odd errors or `Unsupported engine` even though a newer Node is installed | Your terminal may still use an older Node first in its PATH. Check `node -v` (it must say 22.22 or higher). With Homebrew, run `brew unlink node@20` (or whichever older version shows up), then open a new terminal. |
| Android emulator can't be found | Start an emulator in Android Studio first; make sure `ANDROID_HOME` points at your SDK. |
| iOS Simulator doesn't open | Open Xcode once, accept the license, and install an iOS runtime (Xcode > Settings > Platforms). |

## Not done yet (next steps)

- Real values for the placeholders from Step 7: warehouse address, shipping prices, **GST rates** (with your CA), and your own product photos and descriptions.
- Vet appointments: the backend, the Admin screen and the website booking page (/in/vet, "Vet" in the menu) are built (Step 7b). Still to do: the booking screen in the mobile app, and email or SMS confirmations.
- Mates marketplace: the backend and the Admin screen are built (Step 7c). Still to do: the website and mobile app screens, checking breeder registration numbers against the issuing body (today Admin reviews them by eye), and email or SMS alerts for new offers.
- Not built yet: insurance referrals, subscriptions. These become custom Medusa modules in the same way as the vet and Mates modules.
- Razorpay payments, moving photo storage to Cloudflare R2 (a config change, see Step 7c) and hosting (Railway / Render / Vercel) are decided but not wired up.
- Legal pages, GST and the other pre-launch items live in the project's pre-launch checklist.
