# Stage Report: S2 Super Website

Date: 19 Nov 2026. Branch: `claude/intelligent-ride-aojomq` (repo `TECH_SERVICE`, folder `third-space/`).

The blueprint asked for branch `feat/super-website` in the THIRD SPACE repo. This session could only write to `TECH_SERVICE`, so the owner chose to build the site as a separate Next.js app in `third-space/`. The laptop-repair app in the repo root is untouched, apart from excluding `third-space/` from its `tsconfig.json` and ESLint config.

`docs/MASTER_PLAN.md`, `docs/BUSINESS_RULES.md`, `src/styles/tokens.css`, `src/server/slots` and the logo file did not exist here. Tokens and the slot interfaces were created from the blueprint (see below).

## VERIFIED (run in this session)

| Check | Result |
|---|---|
| `tsc --noEmit`, `eslint` | Clean |
| `next build` (Next 16.3.4, Turbopack) | Passes |
| Content checks, gate closed and gate open (`scripts/check-content.mjs`) | Pass: placeholders, consistency, link checker, visible errors, claims, Legal Gate |
| Content checks catch real problems | Forcing closed-gate rules on the open server fails with 7 errors ("Cinema" on /book, /watch, /celebrate, theatre in sitemap) |
| Playwright e2e at 390px, both gate states | 22 passed, 6 skipped by design (gate-specific tests run only in their gate) |
| Booking happy path | Podcast + add-on, total ₹2,830, advance ₹1,415, OTP, consent, booking ID `TS-XXXXXX` |
| Hold expiry | Clock moved 15 min: hold banner gone, error shown, slot available again |
| Slot-taken error | Slot held via API first: UI shows error, slot marked held |
| Gate closed | Home says "Podcast Studio is bookable now"; Watch "coming soon", noindex, no package cards; theatre API 404/400; theatre SEO page 404; not in sitemap; no "film/movie/screening/cinema" in HTML, RSC payload or client JS chunks |
| Gate open | Theatre packages ₹1,699 / ₹2,699 with capacity, content rule, celebration booking with theme + add-ons |
| Hinglish toggle, enquiry form + first-touch UTM cookie, WhatsApp prefilled link | Pass |
| No horizontal scroll; buttons at least 44 px (/, /create, /book, /contact) | Pass |
| Lighthouse mobile, local production server (performance / accessibility) | Home 93/100, Create 94/98, Book 95/100, Watch 95/98 |
| 390 px screenshots of every page in both states | `docs/screenshots/gate-closed/`, `docs/screenshots/gate-open/` |

## UNVERIFIED

- **Lighthouse on real 4G / a deployed URL.** Scores above are from localhost with Lighthouse's simulated mobile throttling.
- **The CI workflow** (`.github/workflows/third-space.yml`) has not run on GitHub yet; its steps match what was run locally.
- **Real device testing** on an Android phone.
- **AVIF/WebP images:** enabled in `next.config.ts`, but there are no photos yet, so nothing to measure.

## What is MOCKED

All in `src/server/slots/mock.ts`, wired in `src/server/slots/index.ts`. Swap adapters there and nowhere else.

| Interface | Mock behaviour |
|---|---|
| `AvailabilityService` | In-memory; one "room" (Watch/Celebrate) and one "studio" (Create/Visit); open/close, 30-min grid and 30-min buffer from config; no slots before launch (25 Nov, 6 PM) |
| `HoldService` | In-memory 15-min holds; lost on server restart |
| `PaymentService` | `mock-razorpay`: creates an order and confirms at once. No money moves |
| `BookingService` | In-memory; booking IDs `TS-` + 6 characters |
| `LeadService` | In-memory enquiries with purpose, source and first-touch UTM |
| `OtpService` | Fixed code `123456`; the screen says "Test mode" while this mock is active |
| Analytics sink `/api/events` | Counts events in memory; also pushes to `window.dataLayer` |
| WhatsApp + email confirmation | **Not sent.** The confirmation page shows the ID; the send hook is marked in `api/checkout/confirm` |

## NEEDS OWNER

Defaults are in `src/config/site.ts` and `src/config/packages.ts`. Change them there and every page, the checkout and JSON-LD follow.

1. **"From ₹799"**: the blueprint's sticky bar says ₹799, but no ₹799 package exists in the audit. The bar is computed from config (₹1,899 with gate closed, ₹1,699 with gate open). Add the ₹799 package to `packages.ts` if it exists.
2. **Contact details**: phone, WhatsApp, email, street address, map link (env vars in `.env.example`). Until set, the site hides them instead of showing placeholders. The test values in `playwright.config.ts` are for tests only.
3. **Hours**: 10 AM to 10 PM daily, 30-min buffer, 60-day booking window.
4. **Money**: 50% advance; 18% GST added on top; 15-min hold.
5. **Refund tiers**: 3+ days 90%, 24 h to 3 days 50%, under 24 h 0% (pattern from the audit, not your decision yet).
6. **Add-on and theme prices**: decor ₹699, cake ₹599, fog ₹499, photos ₹799, extra camera ₹499, basic edit ₹1,499, 3 reels ₹999. These are placeholders for your real rate card.
7. **Capacities**: Premium = 5 and Podcast = 4 are assumed. Creator Plan validity of 30 days is assumed.
8. **Policy wording**: venue rules, terms, privacy, recording consent and file delivery (24 h link, open 7 days). Please have them reviewed.
9. **Logo**: no logo file was supplied. A text wordmark stands in; put the file at `public/brand/logo.svg` and swap `Wordmark` in `src/components/site-header.tsx`.
10. **Room photos**: none supplied, so the Watch gallery is not rendered.
11. **Celebrate with gate closed**: instant celebration booking uses the theatre room, so it stays closed with the gate; only the quote path works. Say if celebrations without a screen should open earlier.
12. **Legal Gate**: set `THIRD_SPACE_LEGAL_GATE=open` only once the licence is in place.
13. **Real adapters**: Razorpay keys, an SMS/WhatsApp OTP provider and an email sender, plus S1 (slot engine) once merged.

## How to test this on your phone

1. Run the commands in `third-space/README.md` on a computer on the same Wi-Fi.
2. On the phone, open `http://<computer-ip>:3000`.
3. Tap **Book now**, pick Podcast Session, a date from 25 Nov, and a slot. A 15:00 countdown appears.
4. Fill your details, tap **Send OTP**, enter `123456`, tap **Verify**.
5. Read the refund tiers and rules, tick the boxes, tap **Pay advance**. Nothing is charged (mock). You land on the booking ID page.
6. Tap **Hinglish** at the top to switch language. Restart with `THIRD_SPACE_LEGAL_GATE=open` to see the Theatre side.
