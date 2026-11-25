# Testing report

Run on 2026-11-23 against commit history of branch `claude/intelligent-ride-aojomq`. Local runs use a fresh PostgreSQL 16 database; CI uses a fresh PostgreSQL service database. **A reused test database fills up (holds last 15 minutes, dates fill) and causes false failures; always recreate it.**

## Layers

| Layer | Tool | Files | Result |
|---|---|---|---|
| Types | `tsc --noEmit` | whole project | pass |
| Lint | ESLint | whole project | pass |
| Unit / database / integration | Vitest 5 against Postgres | 6 files, 37 tests | 37 passed |
| End to end | Playwright, Chromium, 390 px mobile viewport (plus 360, 768, 1024, 1280, 1440 px for the responsive spec), two Legal Gate servers plus a live-mode server | 14 spec files | 84 passed, 0 failed, 43 skipped by design (specs written to run once, on the gate-closed server, are skipped on the other two servers); three consecutive full runs passed |
| Content checks | `scripts/check-content.mjs` | 35 pages | passed |
| Accessibility | axe-core (WCAG 2.1 A/AA), serious and critical | 11 pages | 11 passed |
| Production build | `next build` | | pass |
| Dependency audit | `npm audit` | | 4 high (Prisma CLI), 0 critical |

## Performance measurement (local production build, 390 px, throttled: 4x CPU slowdown, 1.6 Mbit/s, 150 ms latency)

| Measure | Result | Target |
|---|---|---|
| LCP, 14 pages in English and Hinglish | 0.76 s to 1.3 s (home 1.0 s) | 2.5 s |
| CLS, same 28 combinations | worst 0.010 (home was 0.109 before the fix) | 0.1 |
| TTFB (local server) | 150 to 320 ms | n/a (not representative of Vercel) |

Findings fixed: the heavy display font made the home headline wrap to an extra line when it loaded (+48 px shift); Hinglish eyebrow row changed height when the body font loaded. Fixes: reserved headline height on phones, eyebrow stacked on phones, `font-display: optional` for both fonts. Trade-off: on a very slow first visit the page keeps the fallback fonts until the next page. **Not measured:** Lighthouse scores, JS bundle budgets, real-device or Vercel-edge timings, API response times under load.

## Unit and database tests (37)

| File | Tests | What it proves |
|---|---|---|
| `booking-overlap` | 5 | Overlap rejected by direct SQL, back-to-back allowed, pending ignored, pending cannot become live over a live one, **50 parallel inserts → 1** |
| `credit-ledger` | 7 | Sum balance, negative refused, idempotent key, append-only, sign rules, **20 parallel consumes → exactly 8**, service errors, restore once, expiry once |
| `money` | 7 | `rs`, `parseRupees`, round trip, `formatINR`, GST in paise, coupons, refund integers |
| `payments` | 10 | Amount and currency mismatch, **10 parallel confirmations → one**, reconciliation (recover, mismatch, failed, young), refund (exact paise, once, processed, gateway failure, limits) |
| `rate-limit` | 3 | Limit, key separation, **20 parallel callers → exactly the limit** |
| `booking-state` | 5 | Allowed and refused operational transitions |

## End-to-end journeys covered

Customer visits, selects a service, checks availability, selects a slot, fills details with the 18+ declaration, pays (mock gateway), booking confirmed, appears in the guest lookup and the customer account, admin sees it, staff assigned and runs it (room ready, check-in, start, notes, issue, complete). Also: two guests on one slot (slot-taken), hold expiry, free visit, server rejects missing declaration and mismatched price, 30-minute gap, webhook signature and duplicate, guest cancel with refund tier, customer signup claiming history, reschedule, password reset, coupons by admin, CSV export permissions, role limits, Hinglish toggle, enquiry lead, WhatsApp link, 390 px layout and tap targets, live mode without keys (pay at venue, no test OTP).

## What was *not* tested (do not read this report as more than it is)

- **Razorpay against the real API.** Payment logic is tested with a controllable fake gateway and the mock mode. No test-mode transaction has been made.
- **Load.** Concurrency is tested at the database and service level (parallel callers); there is no multi-user load test and no API response-time measurement.
- **Browsers and devices.** Chromium only. No Safari, Firefox or real phone. Layout is automated at 360, 390, 768, 1024, 1280 and 1440 px (no sideways scroll; the 1280 px check found and fixed a header overflow of 28 px).
- **Keyboard and screen-reader review.** axe finds only a subset of accessibility problems; no manual review was done.
- **Email, WhatsApp and SMS delivery.** No provider is configured; only queueing is tested.
- **Restore from backup, rollback drill, monitoring alerts.**
- **Admin UI for refunds through the browser.** Covered at service level (`payments` tests), not by an e2e spec. Plan hours are covered end to end (`plan-hours.spec.ts`).
- **OTP route rate limits** are covered by the limiter tests and code review, not by an e2e that exhausts the limit.

## Defects found by testing during this release (all fixed)

1. `confirmPayment` double-add race (Critical, caught by the parallel-confirmation test).
2. A refund row copied the original `paymentId`, which is unique, so the first real refund would have thrown (caught by the refund test).
3. Calendar `role="grid"` without rows and a label that did not contain the visible text (axe).
4. `--ts-text-faint` contrast 4.29:1 (axe).
5. A test-helper race between parallel projects picking the same day (test-only; helper randomised).
6. Header navigation overflowed the page by 28 px between 1280 and 1308 px wide (responsive spec); the full menu now starts at 1340 px.
7. Test dates were fixed offsets from today and fell outside the 60-day booking window when the clock moved (tests only; offsets now stay inside the window).

## Production verification (2026-11-23, deployment `dpl_451rksecGiqqc12DNfJg4UnQMdgB`)

Migrations 5 to 10 applied on the production database; `/pricing` renders ₹1,899, ₹2,499, ₹4,999, ₹799, ₹950/hr (so the paise migration is consistent with the new code); `/api/availability` returns real slots; `/api/public-config` returns 200 with the new security headers; no runtime errors in the following hour.
