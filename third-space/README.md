# THIRD SPACE: website + booking software

Mobile-first public site, booking engine and staff admin panel for THIRD SPACE, Dhanbad (Private Theatre, Podcast Studio, Creator Studio). A guest sees the price, picks a slot, accepts the 18+ declaration and pays an advance in about a minute; staff run the day from `/admin`.

This is a separate Next.js 16 app inside the `TECH_SERVICE` repo; it does not share code with the repo-root app.

- Blueprint: [`docs/COMPETITOR_AUDIT.md`](docs/COMPETITOR_AUDIT.md)
- What is done, mocked and waiting on the owner: [`docs/STAGE_REPORT.md`](docs/STAGE_REPORT.md)

## Run it

Needs Node 22 and a Postgres database (Supabase works).

```bash
cd third-space
```

```bash
npm install
```

```bash
cp .env.example .env
```

Fill `DATABASE_URL`, `ADMIN_PASSWORD` and `AUTH_SECRET` in `.env`, then create the tables:

```bash
npx prisma migrate deploy
```

```bash
npm run build && npm start
```

`THIRD_SPACE_LEGAL_GATE=open` in `.env` shows the Theatre side; the default `closed` hides every Theatre offer.

Staff log in at `/admin/login` with their name and `ADMIN_PASSWORD`.

## Staff panel (`/admin`)

| Page | What staff do there |
|---|---|
| Today | Day schedule for both spaces; go-live readiness checklist; counts of open incidents, messages to send, payments captured after a hold expired |
| Bookings | Search by ID, phone or name; open a booking to check in, record the balance, mark completed or no-show, cancel with a refund suggested by the tiers, stop a session, and read the guest's accepted declaration |
| Slots | Timeline of the room and the studio; block time for maintenance or private events (blocked slots disappear from the public site) |
| Incidents | Register of incidents: objective facts, witnesses, actions, evidence preserved, authorities contacted; updates are appended, never overwritten |
| Leads | Enquiries with purpose and first-touch UTM; WhatsApp reply link; mark contacted or closed |
| Messages | Booking confirmations queued for WhatsApp and email; open with one tap, then mark sent |
| Policies | Current policy pack, acceptance counts per version, the declaration text, version history |
| Audit log | Every staff and system action (login, check-in, refund, block, incident, payment) with who and when |

Check-in records only how many guests were seen as 18+ ("18+ verified"). The panel never asks for ID numbers or photos.

## Where things live

| Path | What |
|---|---|
| `src/config/policies.ts`, `policy-texts.ts` | Policy pack v2.0: easy summary, Master 18+ Safety & Conduct Policy, three addenda, Mandatory Customer Declaration, version history |
| `prisma/schema.prisma` | Bookings, holds, slot blocks, policy acceptances, leads, OTP codes, incidents, audit log, notifications |
| `src/server/` | Slot engine on Postgres (`slots/engine.ts`), payments (Razorpay or mock), OTP, notifications outbox, audit, admin auth and actions |
| `src/app/admin/` | Staff panel |
| `src/config/site.ts` | Single source of truth: hours, advance %, GST, hold time, add-ons, themes, refund tiers, every policy text, Legal Gate, contact (from env) |
| `src/config/packages.ts` | Packages and prices (server-only, so closed-gate client bundles never carry Theatre names) |
| `src/i18n/` | English and Hinglish copy (`en.ts`, `hi.ts`, `seo.ts`) |
| `src/styles/tokens.css` | Brand tokens: dark, warm 3000K |
| `src/components/booking-flow.tsx` | The estimator and the checkout (one component) |
| `scripts/check-content.mjs` | Build-failing content checks |
| `e2e/` | Playwright tests at 390 px, both gate states |

## Checks

```bash
npm run lint && npm run typecheck && npm run build
```

`npm run test:e2e` uses `TEST_DATABASE_URL` (default: local `thirdspace_test`), applies migrations, and never deletes data.

```bash
npm run test:e2e
```

Start one server per gate state, then run the content checks and screenshots against them:

```bash
THIRD_SPACE_LEGAL_GATE=closed npx next start -p 3100 & THIRD_SPACE_LEGAL_GATE=open npx next start -p 3101 &
```

```bash
node scripts/check-content.mjs http://localhost:3100 && node scripts/check-content.mjs http://localhost:3101
```

```bash
node scripts/screenshots.mjs
```

To allow a flagged phrase in copy, add it to `scripts/claims-whitelist.json`.

## Analytics

No PII. First-touch UTM is kept for 30 days in the `ts_ft` cookie. Events: `view_package`, `select_slot`, `hold_started`, `hold_expired`, `payment_started`, `payment_success`, `consent_signed`, `whatsapp_click`, `enquiry_submitted`. They are pushed to `window.dataLayer` and beaconed to `/api/events`.
