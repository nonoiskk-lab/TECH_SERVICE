# Testing report

Run on 2026-11-23 against commit history of branch `claude/intelligent-ride-aojomq`. Local runs use a fresh PostgreSQL 16 database; CI uses a fresh PostgreSQL service database. **A reused test database fills up (holds last 15 minutes, dates fill) and causes false failures; always recreate it.**

## Layers

| Layer | Tool | Files | Result |
|---|---|---|---|
| Types | `tsc --noEmit` | whole project | pass |
| Lint | ESLint | whole project | pass |
| Unit / database / integration | Vitest 5 against Postgres | 6 files, 36 tests | 36 passed |
| End to end | Playwright, Chromium, 390 px mobile viewport, two Legal Gate servers plus a live-mode server | 11 spec files | 74 passed, 0 failed, 33 skipped by design (specs written to run once, on the gate-closed server, are skipped on the other two servers) |
| Content checks | `scripts/check-content.mjs` | 35 pages | passed |
| Accessibility | axe-core (WCAG 2.1 A/AA), serious and critical | 11 pages | 11 passed |
| Production build | `next build` | | pass |
| Dependency audit | `npm audit` | | 4 high (Prisma CLI), 0 critical |

## Unit and database tests (36)

| File | Tests | What it proves |
|---|---|---|
| `booking-overlap` | 5 | Overlap rejected by direct SQL, back-to-back allowed, pending ignored, pending cannot become live over a live one, **50 parallel inserts → 1** |
| `credit-ledger` | 6 | Sum balance, negative refused, idempotent key, append-only, sign rules, **20 parallel consumes → exactly 8** |
| `money` | 7 | `rs`, `parseRupees`, round trip, `formatINR`, GST in paise, coupons, refund integers |
| `payments` | 10 | Amount and currency mismatch, **10 parallel confirmations → one**, reconciliation (recover, mismatch, failed, young), refund (exact paise, once, processed, gateway failure, limits) |
| `rate-limit` | 3 | Limit, key separation, **20 parallel callers → exactly the limit** |
| `booking-state` | 5 | Allowed and refused operational transitions |

## End-to-end journeys covered

Customer visits, selects a service, checks availability, selects a slot, fills details with the 18+ declaration, pays (mock gateway), booking confirmed, appears in the guest lookup and the customer account, admin sees it, staff assigned and runs it (room ready, check-in, start, notes, issue, complete). Also: two guests on one slot (slot-taken), hold expiry, free visit, server rejects missing declaration and mismatched price, 30-minute gap, webhook signature and duplicate, guest cancel with refund tier, customer signup claiming history, reschedule, password reset, coupons by admin, CSV export permissions, role limits, Hinglish toggle, enquiry lead, WhatsApp link, 390 px layout and tap targets, live mode without keys (pay at venue, no test OTP).

## What was *not* tested (do not read this report as more than it is)

- **Razorpay against the real API.** Payment logic is tested with a controllable fake gateway and the mock mode. No test-mode transaction has been made.
- **Load.** Concurrency is tested at the database and service level (parallel callers); there is no multi-user load test and no response-time measurement.
- **Browsers and devices.** Chromium only. No Safari, Firefox or real phone.
- **Keyboard and screen-reader review.** axe finds only a subset of accessibility problems; no manual review was done.
- **Email, WhatsApp and SMS delivery.** No provider is configured; only queueing is tested.
- **Restore from backup, rollback drill, monitoring alerts.**
- **Admin UI for credits and refunds through the browser.** Covered at service level (`credit-ledger`, `payments` tests), not by an e2e spec.
- **OTP route rate limits** are covered by the limiter tests and code review, not by an e2e that exhausts the limit.

## Defects found by testing during this release (all fixed)

1. `confirmPayment` double-add race (Critical, caught by the parallel-confirmation test).
2. A refund row copied the original `paymentId`, which is unique, so the first real refund would have thrown (caught by the refund test).
3. Calendar `role="grid"` without rows and a label that did not contain the visible text (axe).
4. `--ts-text-faint` contrast 4.29:1 (axe).
5. A test-helper race between parallel projects picking the same day (test-only; helper randomised).

## Production verification (2026-11-23, deployment `dpl_451rksecGiqqc12DNfJg4UnQMdgB`)

Migrations 5 to 10 applied on the production database; `/pricing` renders ₹1,899, ₹2,499, ₹4,999, ₹799, ₹950/hr (so the paise migration is consistent with the new code); `/api/availability` returns real slots; `/api/public-config` returns 200 with the new security headers; no runtime errors in the following hour.
