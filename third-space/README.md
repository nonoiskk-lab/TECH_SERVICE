# THIRD SPACE: guest website

Mobile-first public site and booking flow for THIRD SPACE, Dhanbad (podcast studio + private room). A guest sees the price, picks a slot and pays an advance in about a minute.

This is a separate Next.js 16 app inside the `TECH_SERVICE` repo; it does not share code with the repo-root app.

- Blueprint: [`docs/COMPETITOR_AUDIT.md`](docs/COMPETITOR_AUDIT.md)
- What is done, mocked and waiting on the owner: [`docs/STAGE_REPORT.md`](docs/STAGE_REPORT.md)

## Run it

```bash
cd third-space
```

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run build && npm start
```

`THIRD_SPACE_LEGAL_GATE=open` in `.env.local` shows the Theatre side; the default `closed` hides every Theatre offer.

## Where things live

| Path | What |
|---|---|
| `src/config/site.ts` | Single source of truth: hours, advance %, GST, hold time, add-ons, themes, refund tiers, every policy text, Legal Gate, contact (from env) |
| `src/config/packages.ts` | Packages and prices (server-only, so closed-gate client bundles never carry Theatre names) |
| `src/i18n/` | English and Hinglish copy (`en.ts`, `hi.ts`, `seo.ts`) |
| `src/styles/tokens.css` | Brand tokens: dark, warm 3000K |
| `src/server/slots/` | Availability, Hold, Payment, Booking, Lead and OTP interfaces + in-memory mocks |
| `src/components/booking-flow.tsx` | The estimator and the checkout (one component) |
| `scripts/check-content.mjs` | Build-failing content checks |
| `e2e/` | Playwright tests at 390 px, both gate states |

## Checks

```bash
npm run lint && npm run typecheck && npm run build
```

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
