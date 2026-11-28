# THIRD SPACE V4.0: Phase 0 report (discovery and engineering readiness)

**Date:** 2026-11-23.
**Scope:** Phase 0 only, per the V4.0 execution command. No product code, payment integration or project configuration was changed. Only documentation was added, under `docs/v4/` and `docs/reference/`.
**Gate 0 status:** **NOT PASSED.** It is blocked on the missing primary research document and on owner decisions. See §6.

Status vocabulary used in every V4 document:
- **Evidence classes:** Verified, Measured, Estimated, Documented, Inferred, Proposed, Unknown.
- **Feature stages:** Not Started, Requirements Defined, Designed, Implemented, Tested, Approved, Production Ready.

---

## 1. Project environment report (Verified)

| Item | Finding | Evidence |
|---|---|---|
| Git repository | `nonoiskk-lab/TECH_SERVICE`, branch `claude/intelligent-ride-aojomq`, PR #11 (base `claude/fervent-sagan-zympct`). Working tree clean at `dc41723`. | `git status`, `git log` |
| Existing code to preserve | The repo root holds a **separate, older Next.js app** (`/src`, `/prisma`). THIRD SPACE lives entirely in `third-space/`. Neither may overwrite the other. | Directory listing |
| THIRD SPACE app | Next.js 16.3.4 (App Router), React 19.2.8, TypeScript 5, Tailwind 4, Prisma 6.19.3, Zod 4, Playwright 1.63. Modular monolith: pages, server actions and API routes in one app. | `third-space/package.json` |
| Database | PostgreSQL on Supabase (project `third-space`, ap-south-1, Postgres 17), schema `thirdspace`. 30 Prisma models, 5 migrations, RLS enabled on every table (not exposed through Supabase's REST API). | `prisma/schema.prisma`, `prisma/migrations/` |
| Hosting | Vercel project `third-space` (region bom1), live at https://third-space-gamma.vercel.app. `vercel-build` runs `prisma migrate deploy && next build`. | Vercel API |
| Production env variables (names only) | `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_PASSWORD`, `SITE_URL`, `THIRD_SPACE_LEGAL_GATE=closed`, `POLICY_STATUS=draft` | Vercel API |
| Not configured | Razorpay keys and webhook secret, WhatsApp, Resend email, `CRON_SECRET`, SMS OTP provider, Supabase service-role key, custom domain. Production therefore runs in pay-at-venue mode with OTP off. | Vercel API, `src/server/payments.ts`, `src/server/otp.ts` |
| Environments | **Production only.** `DATABASE_URL` is set for both Production **and Preview**, so every preview build runs migrations against the live database. No staging database exists. | Vercel env targets |
| CI | GitHub Actions `third-space.yml`: typecheck, lint, migrate, build, content checks and e2e at 390px. **Failing on every push since 2026-11-20 (runs 23–32).** See §4. | GitHub Actions API |
| Backups | **Unknown.** Supabase plan and backup or restore settings have not been verified. No restore has ever been tested. | none |
| Monitoring | Vercel runtime logs only. No error reporting or uptime alerting. | none |
| Reference documents | The Skedda audit (12 reports, including Report 11 and 12) is **not available**. See `docs/reference/README.md`. | Filesystem and session search |

## 2. Audit document verification

| Document V4.0 depends on | Available? | Consequence |
|---|---|---|
| Skedda Audit & THIRD SPACE Design Blueprint, Reports 1–12 | **No** | Report 11 (visual spec) and Report 12 (SaaS architecture) cannot be extracted. Requirements sourced from them are **Unknown**. Nothing was invented. |
| Operations Plan (package prices) | Only the launch-package table, seen as a chat image on 2026-11-19 | Prices are classed **Documented (owner chat)** and remain draft until re-approved (V4 Phase 6). |
| Competitor Audit + Super Website Blueprint (PDF) | Yes (chat upload, 15 pages) | Used as the source for the website brief. |
| Policy pack v2.0 (5 PDFs) | Yes (chat uploads) | Implemented verbatim. Still `POLICY_STATUS=draft` pending advocate approval. |
| Perfect Venue audit (this project, 13 documents) | Yes | Measured in a real browser. It is **not** a substitute for the Skedda Report 11: a different product and a different audit. |

## 3. What already exists versus V4.0 (summary)

The full gap analysis is in `TECHNICAL-ARCHITECTURE.md` §4. Headline:

- **Built and tested (e2e):**
  - Public site (all 10 V4 public pages and more).
  - Customer booking with live availability, holds, automatic duration and price, coupons.
  - Razorpay order, signature and webhook flow (mock-tested; no live keys).
  - My Booking, customer accounts, self-reschedule and cancel.
  - Admin with 5 RBAC roles, CSV exports, audit log, feedback-to-review pipeline, equipment lists, two-space schedule.
- **Partially meets V4.0:**
  - Money is stored as **integer rupees, not paise**.
  - Timestamps are `timestamp(3)` **without time zone** (UTC by convention).
  - Overlap prevention uses **advisory locks in application transactions, not a database exclusion constraint**.
  - Payments are a `Payment` table, **not a double-entry ledger**. There is no invoice entity and no gateway refund API call.
  - Credits are hours and minutes on `CreatorMembership`, **not a wallet ledger**.
  - Staff and equipment are `SharedAsset` rows, **not first-class resources with availability**.
  - 5 staff roles, while V4 suggests 8.
- **Not built:**
  - Separate staff dashboard with room-preparation, equipment and reset checklists.
  - Booking states `Draft`, `Hold Expired` and `Payment Failed` as stored states.
  - Reconciliation job.
  - Invoices.
  - Unit and integration test layers, and concurrency or load tests.
  - Staging environment, tested backup restore, monitoring.
  - Threat model.

## 4. Defects found during Phase 0 (Verified, not yet fixed)

| ID | Defect | Evidence | Proposed fix (needs approval) |
|---|---|---|---|
| **F-01** | CI e2e fails: the servers the workflow starts lack `RAZORPAY_WEBHOOK_SECRET` (the webhook test gets 503, expected 400). `RATE_LIMIT_DISABLED` is also missing. | Run 44718861137, job log: `Expected: 400, Received: 503` | Add both variables to the workflow's server-start step (CI configuration change). |
| **F-02** | CI lint fails since 6794021: `docs/audit/tools/*.js` use `require()`. | `npm run lint`: 8 errors, all in `docs/audit/tools/` | Exclude `docs/**` from ESLint, or convert the 4 scripts to `.mjs`. |
| **F-03** | Previous session reports said "59 tests pass" but did not say CI was red. Local runs passed; CI did not. | This report | The reporting format now includes the CI result (see §7). |
| **F-04** | Preview deployments share the production database and run migrations on it. | Vercel env targets | Create a staging database and point Preview at it (see `DEVELOPMENT-ROADMAP.md` Phase 13). |

## 5. Technical risks (ranked)

| # | Risk | Likelihood | Impact | Mitigation (phase) |
|---|---|---|---|---|
| R1 | Building on assumptions about Report 11/12 that later contradict the real audit | High, while missing | High | Obtain the document (Gate 0) |
| R2 | Preview build migrates the production database with an unreviewed migration | Medium | High | Separate staging DB, migration review (13) |
| R3 | Money in rupees blocks paise-exact refunds and GST rounding, and diverges from Razorpay's paise | Medium | High | Paise migration with a backfill (4/6) |
| R4 | Overlap prevention relies on app code; a direct SQL write or a future code path could double-book | Low | Critical | `btree_gist` exclusion constraint on a booking-resource range table (4/5) |
| R5 | No gateway reconciliation; a missed webhook leaves a paid booking unconfirmed until the guest returns | Medium (once live keys exist) | High | Reconciliation job polling Razorpay orders (7) |
| R6 | No tested backup restore | Unknown | Critical | Verify the Supabase plan and run a restore drill (13) |
| R7 | CI red, so regressions are not blocked | Certain today | Medium | F-01, F-02 |
| R8 | Policy pack still draft; Legal Gate closed | Certain | Medium (theatre revenue) | Advocate approval, licences (owner) |

## 6. Gate 0 acceptance criteria

| Criterion | Status |
|---|---|
| Repository, dependencies, services, database and environment inspected | **Met** (§1) |
| Primary research document (Skedda Reports 1–12) read and extracted | **Not met.** Document missing |
| Requirements extracted with IDs, priorities, acceptance criteria and sources | **Met for available sources** (`PRODUCT-REQUIREMENTS.md`) |
| Traceability matrix linking requirements to implementation and tests | **Met** (`REQUIREMENTS-TRACEABILITY.md`) |
| Architecture and decision record | **Met** (`TECHNICAL-ARCHITECTURE.md`, `DECISION-REGISTER.md`) |
| ER diagram | **Met: current (Verified) plus proposed changes** (`ER-DIAGRAM.md`) |
| Design system specification | **Met with caveat:** built from the Perfect Venue measurements, not Report 11 (`DESIGN-SYSTEM.md`, `DESIGN-TOKENS.json`) |
| Missing decisions register | **Met** (`MISSING-DECISIONS.md`): 18 open decisions |
| Dependencies and phase plan | **Met** (`DEVELOPMENT-ROADMAP.md`) |
| Owner approval | **Pending** |

**Gate 0 passes when:**
1. The Skedda audit is placed in `docs/reference/`, or the owner explicitly waives it and approves the Perfect Venue audit as the design reference.
2. The owner answers the P0 decisions in `MISSING-DECISIONS.md`.
3. The owner approves this Phase 0 set.

## 7. Session report (V4.0 format)

- **Current phase:** 0 (Discovery). Gate 0 is not passed.
- **Work completed:** Environment inspection, audit verification, CI failure root-cause analysis, requirements extraction, traceability, architecture and gap analysis, ER diagram, design-system specification and tokens, missing-decisions register, roadmap.
- **Files created:**
  - `docs/reference/README.md`
  - `docs/v4/00-PHASE-0-REPORT.md`
  - `PRODUCT-REQUIREMENTS.md`
  - `REQUIREMENTS-TRACEABILITY.md`
  - `TECHNICAL-ARCHITECTURE.md`
  - `DECISION-REGISTER.md`
  - `ER-DIAGRAM.md`
  - `DESIGN-SYSTEM.md`
  - `DESIGN-TOKENS.json`
  - `MISSING-DECISIONS.md`
  - `DEVELOPMENT-ROADMAP.md`
  - `README.md` (all under `docs/v4/` unless a path is given)
- **Files modified:** none (code and configuration untouched).
- **Tests executed:** none new in this session. Last local run (2026-11-20, fresh test database): 59 passed, 0 failed, 18 skipped by design.
- **CI:** **failing** (F-01, F-02). The last green CI run was #21 on 2026-11-19.
- **Known issues:** F-01 to F-04, risks R1–R8.
- **Pending dependencies:** Skedda audit; owner decisions; Razorpay, WhatsApp and Resend credentials; staging database.
- **Security concerns:**
  - Preview builds share the production database.
  - No threat model yet.
  - Single bootstrap owner password (`ADMIN_PASSWORD`) still enabled alongside per-staff accounts.
- **Next actions (after approval):** fix F-01 and F-02 so CI is green, then start Phase 1 in the order in `DEVELOPMENT-ROADMAP.md`.
