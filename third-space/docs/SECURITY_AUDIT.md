# Security audit

**Scope and honesty.** This is an engineering review by the development team (code review, targeted tests, dependency audit, header and secret checks) performed on 2026-11-23. It is **not** an independent penetration test and does not certify compliance with any law or standard. Findings are classified Critical / High / Medium / Low.

## Findings fixed in this release

| # | Sev | Finding | Fix | Verified by |
|---|---|---|---|---|
| S1 | Critical | `confirmPayment` read the payment status before locking. A webhook and the browser callback arriving together each saw "not captured" and added the advance more than once (balance negative, duplicate notifications and plan grants). | Row lock (`SELECT … FOR UPDATE`) on the payment, status re-read after the lock | `tests/payments.test.ts` (10 parallel confirmations → one fresh result, advance added once) |
| S2 | Critical | Next.js 16.3.4 had a critical advisory (RCE in `next/og`, plus cache issues). `next/og` is not used by the app, but the version was vulnerable. | Upgraded to 16.4.6 | `npm audit` |
| S3 | High | `/api/otp` had no rate limit: SMS bombing (cost) and brute force of a 6-digit code (a new `send` reset the attempt counter). | Per-IP and per-phone limits on send and verify; phone hashed in the limiter key | `tests/rate-limit.test.ts` (limiter), route covered by code review |
| S4 | High | The webhook recorded the event id before processing it, so a processing failure made Razorpay's retry look like a duplicate and the payment event was lost. Two simultaneous deliveries could also both pass the "seen?" check. | Claim the event id with a unique insert first; if processing throws, release the claim and answer 500 so Razorpay retries | e2e duplicate test; `tests/payments.test.ts` |
| S5 | High | Gateway amount and currency were never compared with the order. | `confirmPayment` compares paise and INR; mismatch confirms nothing and writes an audit entry | `tests/payments.test.ts` |
| S6 | High | Customer sessions were stateless 30-day cookies; changing a password could not sign out other devices. No password reset existed. | `Customer.sessionsValidFrom` revokes older sessions on change or reset; reset links are hashed, single-use, 30 minutes, same answer for unknown accounts, rate limited | `e2e/account-reset.spec.ts` |
| S7 | High | Preview builds ran `prisma migrate deploy` against the production database. | Only `VERCEL_ENV=production` migrates (`scripts/vercel-build.mjs`). Previews still *read* the production database. | Build logs; DB migration table |
| S8 | High | Membership credit balance was checked outside its transaction (overdraw by race), balance was an editable field. | Append-only ledger with a database trigger that refuses negative balances | `tests/credit-ledger.test.ts` (20 parallel consumes → exactly 8) |
| S9 | Medium | No database guard against double booking. | `booking_no_overlap` exclusion constraint | `tests/booking-overlap.test.ts` |
| S10 | Medium | Missing HSTS and Content-Security-Policy. | HSTS (2 years), CSP, COOP added | Chromium check of 6 pages: 0 violations; headers seen on the live deployment |
| S11 | Medium | Rate limiter was read-then-write (first-hit race). | Single atomic `INSERT … ON CONFLICT` | `tests/rate-limit.test.ts` (20 parallel callers → exactly the limit) |
| S12 | Medium | Ops statuses could be set from any state (a cancelled or refunded booking could be "completed"). | `canOpsTransition` guard in admin and staff actions | `tests/booking-state.test.ts` |
| S13 | Medium | Vitest (dev dependency) had critical advisories. | Upgraded to 5.1.1 | `npm audit` |
| S14 | Medium | Colour contrast and invalid ARIA on the calendar (accessibility). | Token and markup fixed | `e2e/a11y.spec.ts` |

## Checked and found acceptable

- **Secrets:** repository scan for Razorpay keys, private keys and connection strings found only placeholders (`docs/DEPLOY.md`, `.env.example`). No `.env` is tracked. Production secrets live in Vercel environment variables; Razorpay secrets are only read in server code and never sent to the browser.
- **SQL injection:** all queries use Prisma or tagged-template `$queryRaw`/`$executeRaw` (parameterised). No `$queryRawUnsafe`.
- **XSS:** React escapes output. The only `dangerouslySetInnerHTML` is JSON-LD with `<` escaped.
- **Authorisation:** every admin page, export and server action checks the session and permission on the server; staff portal checks `checkin`; customers only query their own records; guest booking access needs the private token. Staff e2e checks role limits; `master.spec.ts` checks the finance pages and CSV export for the staff role.
- **Cookies:** httpOnly; `SameSite=Strict` (staff) and `Lax` (customers); `Secure` in production.
- **Passwords:** scrypt with per-password salt; constant-time comparison.
- **CSRF:** mutations are Next.js server actions, which reject cross-origin requests by comparing the Origin and Host headers; cookies are SameSite. This is framework behaviour, not separately tested here.
- **File uploads:** none implemented (recordings are access-controlled links with expiry and retention).
- **Logs:** audit entries and errors do not include card data (none is handled) or passwords. Notification bodies contain booking links and, for reset emails, the reset link (see O6).

## Open findings

| # | Sev | Finding | Plan |
|---|---|---|---|
| O1 | High | 4 `npm audit` high advisories in Prisma 6's CLI toolchain (`prisma`, `@prisma/config`, `effect`, `deepmerge-ts`). They affect the build-time CLI, not the running app. The fix is Prisma 7 (major). | Upgrade Prisma in a separate, tested change |
| O2 | High | The bootstrap login with the shared `ADMIN_PASSWORD` is still enabled next to per-person staff accounts. | Owner decision MD-17: restrict to break-glass with an alert, or remove |
| O3 | High | No staging database; previews read production data. | Create a staging Supabase project (needs owner approval: it creates a resource) |
| O4 | High | Backups, point-in-time recovery and a restore drill are unverified. No error monitoring or uptime alerting. | Verify the Supabase plan and run a drill; add monitoring (DEPLOYMENT_GUIDE) |
| O5 | Medium | CSP allows `'unsafe-inline'` for scripts and styles (Next.js inline bootstrap). | Move to nonce-based CSP |
| O6 | Medium | Reset links are stored in the `Notification` outbox body in clear (they expire in 30 minutes and are single use). | Scrub bodies of sent reset messages, or send by provider without storing the token |
| O7 | Medium | No two-factor authentication for admin; login throttling is per IP, not per account. | Add TOTP; per-account lockout |
| O8 | Medium | Razorpay has never been exercised against the real API (no keys). | Test-mode run (RELEASE_CHECKLIST) |
| O9 | Low | The daily cron limits how quickly expired holds' bookings and missed payments are cleaned up. | Run `/api/cron/run` every 15 minutes |
| O10 | Low | `CRON_SECRET` is not set in production, so the cron endpoint answers 401 and no cron step currently runs. | Owner sets `CRON_SECRET` (never in chat) |

## Release position

No known **Critical** finding is open. High findings O1 to O4 are open and documented; none of them is exploitable by a guest through the running application today, but O2 to O4 are operational risks that should be closed before taking real payments.
