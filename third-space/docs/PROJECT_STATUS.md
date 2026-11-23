# THIRD SPACE: project status and progress file (V5.0)

Resume from here. Updated after each step. Classes: Implemented, Tested, Verified, Production-configured, Live.

## Done
- Phase 0 docs (docs/v4/), CI green (F-01, F-02) — run #35 success.
- Production DB checked: 0 bookings, no overlaps, btree_gist not yet installed.

## Done (V5 session)
- DB-level overlap constraint `booking_no_overlap` + Vitest (50 parallel inserts -> 1 wins). Tested locally.
- next 16.3.4 -> 16.4.6 (critical advisory). 4 high remain in Prisma CLI build deps.
- Money in integer paise end to end (migration 20261123130000, src/lib/money.ts, admin forms in rupees, Razorpay boundary, CSV/notify). Tested: 12 unit, 59 e2e, 34 content pages.

- Credit ledger: CreditEntry (append-only, DB trigger blocks negative balance, idempotency key), admin consume/adjust, cancel reversal, expiry on cron. 6 DB tests incl. 20 parallel consumes. Tested: 18 unit, 59 e2e.
- F-04 fixed in code: preview builds no longer migrate (scripts/vercel-build.mjs).

- Razorpay hardening: FIXED a critical race (parallel webhook+callback double-added the advance; row lock in confirmPayment), webhook claim-then-release idempotency, amount/currency verification, gateway refund API (idempotent, admin button), reconciliation job (cron step 7). 10 new DB-backed tests (28 unit total), 59 e2e.

- Security: OTP send/verify rate limits (was none), atomic rate limiter, HSTS + CSP + COOP headers (0 CSP violations on 6 pages in Chromium), customer password reset (hashed single-use 30-min token, no enumeration) and server-side session revocation. 31 unit, 61 e2e.

- Staff portal /staff (daily schedule, My bookings, booking detail, room ready, check-in, start/complete, notes, issue report, manager assignment), booking-state transition guard (completed/in_progress only along confirmed->checked_in->...). Staff land in /staff. 36 unit, 63 e2e.

- Accessibility: axe WCAG 2.1 A/AA on 11 pages at 390px; fixed contrast token (#7a7a7a 4.29:1 -> #666 5.7:1) and calendar ARIA (invalid grid role, label mismatch). 74 e2e, 36 unit.

## Current
- Production deploy (needs migrate on prod DB: paise + ledger + reset + staff ops), docs set (13 files), release audit and scores.

## Remaining (in order)
5. Password reset, staff portal, roles
6. Unit/integration test layers, a11y, security checks
7. Docs set (13 files), release audit, scores

## Blocked by external input
- Razorpay keys, WhatsApp/Email provider, domain, GSTIN, Skedda reports 11/12, staging DB approval (creates a Supabase project).

## Known failures
- none open
