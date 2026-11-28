# THIRD SPACE: project status (V5.0)

Updated 2026-11-28. Companion documents: PRODUCT_REQUIREMENTS, SYSTEM_ARCHITECTURE, DESIGN_SYSTEM, DATABASE_SCHEMA, BOOKING_ENGINE, API_DOCUMENTATION, RAZORPAY_INTEGRATION, SECURITY_AUDIT, TESTING_REPORT, DEPLOYMENT_GUIDE, ASSUMPTIONS_AND_DECISIONS, RELEASE_CHECKLIST. Earlier discovery work: `docs/v4/`.

## Latest (2026-11-28): how complete is the site (honest estimate)

| Part | Done | What is left |
|---|:-:|---|
| Booking software (engine, holds, no double-booking, accounts, plan hours, staff portal, admin) | about 90% | invoices, 8-role model, equipment and staff as bookable resources |
| Design system v6.1 in code (orange and white, all screens, staff dashboard) | 100% in code | owner approval; production still has the old design |
| Brand assets in code (logo colourways, icons, apple icon, share image, mode badges, covers, 404) | about 40% of the asset plan | final logo, real photos, per-page share images, email header, empty-state art placement |
| Online payments (Razorpay) | code done, 0% proven | test keys and a test-mode run (owner: pending) |
| Messages (email, WhatsApp, SMS) | queue only | provider accounts and keys |
| Launch operations (staging DB, backups, monitoring, cron secret, domain, GSTIN) | about 20% | owner inputs and approvals (see below) |
| **Overall** | **about 70% to a real public launch** | code is ahead of the business inputs; the blockers are mostly owner decisions, keys and real photos, not code |

These percentages are the author's estimate from the evidence tables below, not a measured figure.

Since the design update (preview only, nothing in production): original logo colourways, favicon, apple icon, PWA icons (maskable), 1200x630 share image, three mode badges, service-card covers and the 404 illustration (`docs/IMAGE_ASSET_PLAN.md` section 10; `docs/IMAGE_SIZE_SHEET.md` lists every image, place and size). Latest local run: **46 unit and 101 e2e tests pass, 0 failed**; typecheck, lint and build clean.

## Design system v6 (2026-11-25)

The owner's *Cinema Design System Audit & Build Plan* is built in code (`docs/DESIGN_SYSTEM.md`): Poppins, an **orange and white** theme (owner's later instruction; the plan's espresso and amber palette was replaced), mode colours, the component list, the customer screens (incl. QR ticket, plan hours used, tab bar) and the staff dashboard (three-lane calendar, daily checklist and report). 46 unit and 93 e2e tests pass; 20 pages pass axe; worst CLS 0.000 and LCP 1.23 s. **Preview only; production still runs the previous design until the owner approves.**

## One-line status

The application is built, tested and **deployed** at https://third-space-gamma.vercel.app in **pay-at-venue mode**. It is **not ready to take online payments**: Razorpay has never been exercised against the real API, and backups, monitoring, staging and the daily-only cron are open. No email, WhatsApp or SMS message is sent (no provider is connected).

## Evidence levels

| Area | Implemented | Tested | Verified on the live deployment | Production-configured | Live |
|---|:-:|:-:|:-:|:-:|:-:|
| Public website, pricing, policies | ✔ | ✔ | ✔ (pricing, headers, availability) | ✔ | ✔ |
| Booking engine, holds, double-booking guard | ✔ | ✔ (DB, service, e2e) | ✔ (availability) | ✔ | ✔ pay-at-venue |
| Customer accounts, reset, history | ✔ | ✔ | not exercised on live | ✔ | ✔ |
| Admin dashboard and modules | ✔ | ✔ | login page only | ✔ | ✔ |
| Staff portal | ✔ | ✔ | not exercised on live | ✔ | ✔ |
| Credit ledger | ✔ | ✔ (DB) | migration applied | ✔ | ✔ |
| Razorpay orders, webhook, refunds, reconciliation | ✔ | ✔ (fake gateway, mock) | | ✘ no keys | ✘ |
| Email / WhatsApp / SMS | adapters + outbox | queueing only | | ✘ | ✘ |
| Backups, monitoring, staging | ✘ | ✘ | | ✘ | ✘ |

## Done in the V5 session (commits on `claude/intelligent-ride-aojomq`)

1. CI green again (F-01, F-02); CI now also runs the unit/database tests.
2. Database overlap guard (`booking_no_overlap`).
3. Integer paise end to end (one-way migration).
4. Append-only credit ledger with DB-enforced rules.
5. Payment hardening: fixed a **critical** parallel-confirmation race, webhook idempotency, amount verification, refund API, reconciliation.
6. Security: OTP rate limits, atomic limiter, HSTS and CSP, password reset, session revocation, Next.js security upgrade, vitest upgrade, preview builds no longer migrate.
7. Staff portal and booking-state guard.
8. Accessibility fixes found by axe.
9. Production deployment with migrations 5 to 10 applied and checked; documentation set.

## Test totals (latest local run, fresh database)

46 unit/database tests passed · 101 end-to-end passed, 0 failed (52 skipped by design) on 2026-11-27 · 11 axe accessibility checks passed · 35 content checks passed · layout checked at six widths · LCP 0.76 to 1.3 s and worst CLS 0.010 on 14 pages under mobile throttling · typecheck, lint and production build pass. `npm audit`: 0 critical, 4 high (Prisma 6 CLI toolchain, build-time). Details and the list of what was **not** tested: TESTING_REPORT.

## Known issues and open risks

See SECURITY_AUDIT "Open findings" (O1 to O10) and RELEASE_CHECKLIST section B. In short: no staging database, backups unverified, no monitoring, `CRON_SECRET` unset so cron does not run, bootstrap password login still enabled, Razorpay unverified, CSP keeps `unsafe-inline`, reset links stored in the outbox, no load or cross-browser testing.

## Incomplete features

Invoices; 8-role model; guests paying with plan hours online; real messaging delivery; first-class equipment and staff resources; `timestamptz` and foreign keys for `resource`/`packageId`; design approval, final logo and real photography (see IMAGE_ASSET_PLAN section 6); Skedda-based specification (document missing).

## External inputs still required

| Input | Needed for |
|---|---|
| Razorpay account, test then live keys, webhook secret | Online payments |
| `CRON_SECRET` (and a scheduler faster than daily) | Expiry, reminders, reconciliation |
| Supabase plan confirmation, staging project approval | Backups, staging |
| Resend key and sender, WhatsApp Business account | Messages |
| Domain | Public launch |
| GSTIN and invoice format | Invoices |
| Price, GST, advance, refund, hours approvals | Commercial go-live |
| Advocate approval of policies; film licences | Policies, Legal Gate |
| Skedda Reports 1 to 12 or a written waiver | Design reference |

## Quality score (out of 10; every score below 9 has a reason and a plan)

| Category | Score | Reason | Improvement plan |
|---|:-:|---|---|
| Product completeness | 7.5 | Core modules work; missing items listed above | Invoices, guest self-redemption of plan hours, 8 roles after owner input |
| Booking reliability | 8 | Engine plus DB constraint, heavily tested for races at DB and service level | Browser-level concurrent test, load test, equipment and staff as constrained resources |
| Payment security | 7 | Logic is strong and tested, but only against a fake gateway; cron is daily | Test-mode run, 15-minute reconciliation, real refund trial |
| UI/UX quality | 7 | Consistent tokens and components; not owner-approved; illustrations not photos | Owner review, photography, shared skeletons |
| Mobile responsiveness | 8 | Automated at 360, 390, 768, 1024, 1280, 1440 px; no real devices | Real devices, Safari |
| Database integrity | 8.5 | Exclusion, ledger triggers, RLS; strings without FKs, no `timestamptz` | Dedicated migration on a staging DB |
| Security | 7.5 | Critical findings fixed; no pen test; open O1 to O7 | Close O2 to O4, Prisma 7, nonce CSP, 2FA |
| Performance | 7 | LCP and CLS measured and fixed under mobile throttling; no Lighthouse, bundle budget or API load numbers; every page is rendered per request (dynamic) | Lighthouse in CI, caching for static marketing pages, API timing |
| Accessibility | 7 | axe passes on 11 pages; no manual keyboard or screen-reader review | Manual audit |
| Maintainability | 7.5 | Modular, 110 automated tests, documentation; some very large components and files | Split the booking flow component and engine file |
| Deployment readiness | 5.5 | Deployed and verified, but no staging, backups unverified, no monitoring, cron inactive, no payment keys | RELEASE_CHECKLIST section B |

## Resume instructions

Everything above is committed. Next actions in order: set `CRON_SECRET`; Razorpay test keys and the test-mode checklist; staging database; backup drill and monitoring; owner decisions MD-01 to MD-18 (`docs/v4/MISSING-DECISIONS.md`); then Prisma 7 and the performance pass.
