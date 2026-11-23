# Decision register

**Date:** 2026-11-23. **Phase:** 0.

The register has three parts: decisions locked by V4.0, decisions the owner made in chat, and architecture decisions made by engineering. Open questions are in `MISSING-DECISIONS.md`; when one is answered, it moves here with the date.

## A. Locked by the V4.0 prompt (Documented, source V4)

| ID | Decision |
|---|---|
| V4-L01 | Fully custom product, no white-label booking SaaS |
| V4-L02 | Responsive web first (no native app in V1) |
| V4-L03 | Next.js + React + TypeScript + Tailwind CSS |
| V4-L04 | PostgreSQL |
| V4-L05 | Modular monolith |
| V4-L06 | Razorpay; currency INR |
| V4-L07 | Business timezone Asia/Kolkata |
| V4-L08 | Independent THIRD SPACE branding; Skedda's brand identity and assets are not copied |
| V4-L09 | Custom customer, admin and staff portals |
| V4-L10 | Release mapping: V1 website, booking, calendars, Razorpay, admin · V1.1 staff ops, CRM, refunds, reports · V1.2 credits, memberships, WhatsApp · V2 later |
| V4-L11 | Work proceeds phase by phase; each phase needs explicit owner approval at its gate |

All of V4-L01..L07 and L09 are already satisfied by the current build (Verified in `00-PHASE-0-REPORT.md` §1). L08 is satisfied: no Skedda asset is in the repository.

## B. Owner decisions from chat (Documented, source OWN-n)

Dates come from the project history. The dates of OWN-1 and OWN-2 are approximate (Inferred from the first commits); the owner should confirm them.

| ID | Date | Decision | Used by |
|---|---|---|---|
| OWN-1 | 2026-11-19 | Build THIRD SPACE as its own app in `third-space/`, Dhanbad venue with Private Theatre and Podcast/Creator Studio | Whole project |
| OWN-2 | 2026-11-19 | Policy pack v2.0 and Mandatory Customer Declaration are implemented verbatim | POL, BR-10 |
| OWN-3 | 2026-11-19 | Booked time = work time + 30-minute setup, no rounding; 30-minute gap after every booking | BR-01, BR-02 |
| OWN-4 | 2026-11-19 | Minimum price ₹799 before add-ons and GST | BR-03 |
| OWN-5 | 2026-11-19 | Launch package table (prices still draft per V4 Phase 6) | BR-04 |
| OWN-6 | 2026-11-22 | Website UX/UI to follow perfectvenue.com structure and feel (implemented as design v5) | WEB-06, `DESIGN-SYSTEM.md` |
| OWN-7 | 2026-11-23 | V4.0 prompt adopted; Phase 0 only until approval | This document set |

OWN-6 may conflict with V4's request to base the design on Skedda Report 11. This conflict is open as **MD-01**.

## C. Architecture decision records (engineering)

| ID | Decision | Status | Rationale | Revisit |
|---|---|---|---|---|
| ADR-01 | Prisma ORM on Supabase Postgres, schema `thirdspace`, RLS on every table, no Supabase REST exposure | Implemented | One typed data layer; RLS as defence in depth | No |
| ADR-02 | Server actions for admin and guest mutations; API routes only for booking flow, webhooks, cron | Implemented | Fewer endpoints, framework origin checks | No |
| ADR-03 | Overlap prevention via `pg_advisory_xact_lock` per resource inside the booking transaction | Implemented | Simple, correct for app paths | **Yes:** add exclusion constraint (MD-15) |
| ADR-04 | Money stored as integer rupees | Implemented | Early simplicity | **Yes:** V4 requires paise (MD-14) |
| ADR-05 | Timestamps `timestamp(3)` stored as UTC, displayed in Asia/Kolkata | Implemented | Prisma default | **Yes:** move to `timestamptz` (NFR-07) |
| ADR-06 | `Payment` table plus `WebhookEvent` idempotency; booking confirmed only by verified signature or webhook | Implemented | Correctness | Extend with ledger (FIN-01) |
| ADR-07 | Pay-at-venue mode when Razorpay keys are absent; no fake payment UI | Implemented | Honest live site without keys | No |
| ADR-08 | Customer auth: scrypt hashes, HMAC-signed httpOnly cookie | Implemented | No third-party auth dependency | Add OTP provider later |
| ADR-09 | `vercel-build` runs `prisma migrate deploy` before `next build` | Implemented | Schema and code ship together | **Yes:** Preview must not use the production DB (MD-13) |
| ADR-10 | E2E tests with Playwright at 390px against a real Postgres | Implemented | Mobile-first and real SQL | Add unit, integration and concurrency layers |
| ADR-11 | Proposed: double-entry ledger in paise as the source of truth for money; `Payment` becomes a gateway record | Proposed | V4 FIN-01 | Phase 4 |
| ADR-12 | Proposed: `booking_resources` table with `tstzrange` and a `btree_gist` exclusion constraint for exclusive resources | Proposed | V4 BKG-03, BKG-04 | Phase 4–5 |
| ADR-13 | Proposed: credit wallet as ledger entries (purchase, consume, restore, adjust, expire), balance derived, row-locked on consume | Proposed | V4 CRD-01; fixes the current race | V1.2 |
