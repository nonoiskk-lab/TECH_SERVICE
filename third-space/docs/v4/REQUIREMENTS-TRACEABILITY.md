# Requirements traceability matrix (RTM)

**Date:** 2026-11-23. **Phase:** 0. Requirement IDs, priorities and acceptance criteria are defined in `PRODUCT-REQUIREMENTS.md`.

**How to read this matrix:**
- **Stage** uses the V4 feature stages: Not Started, Requirements Defined, Designed, Implemented, Tested, Approved, Production Ready.
- **Tested** means an automated e2e test exercises the behaviour and passed locally on 2026-11-20. CI is currently red (F-01, F-02), so **no row is Approved or Production Ready**.
- **Gap** lists what the V4 acceptance criterion needs that the current build lacks.
- Paths are relative to `third-space/`. Tests are in `e2e/`.

## Website (WEB)

| ID | Implementation | Tests | Stage | Gap |
|---|---|---|---|---|
| WEB-01 | `src/app/(site)/*` (home, theatre, podcast, creative studio, pricing, gallery, about, contact, FAQs, policies, Dhanbad SEO pages) | `site.spec.ts`, `scripts/check-content.mjs` (34 pages) | Tested | Real photography not supplied |
| WEB-02 | `src/server/catalog.ts` reads `Package`/`AddOn`; `(site)/pricing` | `master.spec.ts` (pricing) | Tested | Prices draft (BR-04) |
| WEB-03 | `THIRD_SPACE_LEGAL_GATE`, `src/server/titles.ts` | `gate.spec.ts` (6) | Tested | None |
| WEB-04 | `src/lib/locale.ts` | `site.spec.ts` (Hinglish toggle) | Tested | None |
| WEB-05 | Tailwind layouts | `site.spec.ts` (390px, no h-scroll, 44px) | Tested (390px only) | 1440/1280/1024/768/360 not automated |
| WEB-06 | `src/styles/tokens.css`, `src/components/ui.tsx` | Visual check only | Implemented | Design system not yet approved (MD-01) |
| WEB-07 | — | — | **Unknown** | Skedda Report 11 missing |

## Customer (CUS)

| ID | Implementation | Tests | Stage | Gap |
|---|---|---|---|---|
| CUS-01 | `src/server/customer-auth.ts`, `customer-actions.ts`, `(site)/account/*` | `master.spec.ts` (accounts) | Tested | Mobile OTP provider not configured |
| CUS-02 | `(site)/book`, `api/availability`, `api/holds`, `api/checkout` | `booking.spec.ts` (6), `master.spec.ts` | Tested | Paid path mock-only (no test keys) |
| CUS-03 | `(site)/my-booking/*`, `(site)/account` | `master.spec.ts` | Implemented | No receipt document (PAY-09); files list only via token links |
| CUS-04 | `customer-actions.ts` cancel; tier in `src/lib/business.ts` | `master.spec.ts` | Implemented | Refund not sent to gateway (PAY-07); rupees |
| CUS-05 | `src/server/reschedule.ts`, `reschedule-form.tsx` | `master.spec.ts` | Tested | Rule Proposed (BR-08) |
| CUS-06 | `(site)/account` shows membership hours | none | Implemented (partial) | No wallet history (CRD-01) |
| CUS-07 | `feedback-actions.ts`, `(site)/feedback/[id]`, `Feedback` | `master.spec.ts` | Tested | None |

## Booking engine (BKG)

| ID | Implementation | Tests | Stage | Gap |
|---|---|---|---|---|
| BKG-01 | `src/server/slots/*`, `Setting`, `SlotBlock` | `booking.spec.ts`, `master.spec.ts` | Tested | None |
| BKG-02 | `Hold` + `pg_advisory_xact_lock` | `booking.spec.ts` (expiry, slot taken) | Tested | No 2-request parallel test (NFR-03) |
| BKG-03 | — (app-level lock only) | — | **Not Started** | Needs `btree_gist` exclusion constraint (R4) |
| BKG-04 | `Resource` (2 spaces), `SharedAsset`/`PackageAsset` | `master.spec.ts` | Implemented (partial) | Equipment/staff not independent resources |
| BKG-05 | `Booking.status` enum, `LIVE_STATUSES` | partial | Implemented (partial) | No Draft / Hold Expired / Payment Failed states; transitions not centralised |
| BKG-06 | Theatre runtime from `Title`, capacity on package | `booking.spec.ts` (celebration), `gate.spec.ts` | Tested | None |
| BKG-07 | Studio durations from episodes/reels; add-ons | `master.spec.ts` (podcast/creator time) | Tested | Operator not a scheduled resource |
| BKG-08 | `api/calendar` | `booking.spec.ts` | Tested | None |
| BKG-09 | `admin/(panel)/bookings/new`, same slot engine | `admin.spec.ts` | Tested | None |
| BKG-10 | Admin packages, add-ons, coupons, slots | `admin.spec.ts` | Tested | Resources not admin-editable |

## Payments and finance (PAY, FIN)

| ID | Implementation | Tests | Stage | Gap |
|---|---|---|---|---|
| PAY-01 | `src/server/payments.ts`, `api/checkout` | `booking.spec.ts` (mock) | Tested (mock) | No test keys configured |
| PAY-02 | `api/checkout/confirm` HMAC | `booking.spec.ts` | Tested (mock) | None |
| PAY-03 | `api/webhooks/razorpay`, `WebhookEvent` | `master.spec.ts:86` | Tested locally; **fails in CI (F-01)** | CI env |
| PAY-04 | `Payment` table separate from `Booking` | `master.spec.ts` | Tested | None |
| PAY-05 | Hold expiry via `api/cron/run`; late capture | `booking.spec.ts` (expiry) | Implemented (partial) | Late capture → refund pending not tested |
| PAY-06 | — | — | Not Started | R5 |
| PAY-07 | `markRefundedAction`, `refund.processed` webhook | none | Implemented (manual) | **No Razorpay refunds API call** |
| PAY-08 | `advancePaid`, balance at venue in admin booking | `booking.spec.ts` (advance) | Tested | Rupees |
| PAY-09 | Confirmation page + declaration PDF route | `booking.spec.ts` | Implemented (partial) | No GST line items |
| FIN-01 | — | — | Not Started | Ledger in paise |
| FIN-02 | Price fields stored on `Booking` at hold time | `master.spec.ts` | Implemented (partial) | No full line-item snapshot |
| FIN-03 | — | — | Not Started | GST undecided (MD-03) |
| FIN-04 | Tier logic in `src/lib/business.ts` | none | Implemented | Tiers Inferred (BR-07); no paise |
| FIN-05 | — | — | Not Started | GSTIN, numbering (MD-08) |
| FIN-06 | `src/server/coupons.ts`, `api/coupons` | `booking.spec.ts` | Tested | Usage-limit atomicity not concurrency-tested |

## Credits and CRM (CRD, CRM)

| ID | Implementation | Tests | Stage | Gap |
|---|---|---|---|---|
| CRD-01 | `CreatorMembership`, `MembershipUsage` | none | Implemented (partial) | Not a ledger; **balance check outside the transaction (race)**; no DB CHECK |
| CRD-02 | `membershipUsageAction` (admin) | none | Implemented (partial) | Guest cannot pay with credits online |
| CRD-03 | Memberships are prepaid, no auto-charge | none | Implemented | None |
| CRM-01 | `Customer`, `admin/(panel)/customers` | `admin.spec.ts` | Tested | No preferences field |
| CRM-02 | `PolicyAcceptance`, consent flags at booking | `gate.spec.ts` | Implemented (partial) | No WhatsApp opt-out record |
| CRM-03 | `src/server/notify.ts`, `Notification` | none | Implemented (no provider) | Provider undecided (MD-10) |
| CRM-04 | `notify.ts` email path | none | Implemented (no key) | Resend key |
| CRM-05 | — | — | Not Started | — |

## Operations and admin (OPS, ADM)

| ID | Implementation | Tests | Stage | Gap |
|---|---|---|---|---|
| OPS-01 | Check-in in `admin/(panel)/bookings/[id]` | `admin.spec.ts` | Tested | None |
| OPS-02 | Status actions in admin booking | `admin.spec.ts` | Tested | Not driven by a central state machine |
| OPS-03 | — | — | Not Started | V1.1 |
| OPS-04 | Equipment list per booking (read-only) | `master.spec.ts` | Implemented (partial) | No checklists |
| OPS-05 | `Incident`, `admin/(panel)/incidents` | `admin.spec.ts` | Tested | None |
| OPS-06 | `RecordingFile`, `files/[token]` | none | Implemented | Storage provider and retention undecided (MD-11) |
| OPS-07 | `admin/(panel)/slots` timeline | `master.spec.ts` | Tested | None |
| ADM-01 | `admin/(panel)/page.tsx` | `admin.spec.ts` | Tested | Not ledger-based |
| ADM-02 | `admin/(panel)/bookings`, `admin/export/[kind]` | `admin.spec.ts` | Tested | None |
| ADM-03 | `admin/(panel)/calendar` | `admin.spec.ts` | Tested | None |
| ADM-04 | `admin/(panel)/reports` | `admin.spec.ts` | Tested | Rupee totals |
| ADM-05 | `admin/(panel)/settings` | `admin.spec.ts` | Implemented (partial) | Tax and refund tiers not editable |
| ADM-06 | `src/server/audit.ts`, `AuditLog` | `admin.spec.ts` | Tested | Guest-side changes partially logged |

## Security and non-functional (SEC, NFR)

| ID | Implementation | Tests | Stage | Gap |
|---|---|---|---|---|
| SEC-01 | `src/lib/session.ts`, `customer-auth.ts` | `session.spec.ts` (4) | Tested | None |
| SEC-02 | Role checks in `src/server/admin/*` | `session.spec.ts` | Tested | No permission table |
| SEC-03 | 5 roles in `StaffUser.role` | `session.spec.ts` | Implemented (partial) | V4 lists 8 (MD-06) |
| SEC-04 | Zod schemas; Prisma parameterised | none dedicated | Implemented | No raw-SQL lint |
| SEC-05 | `src/server/rate-limit.ts`, `RateLimit` | disabled in e2e | Implemented | Not tested |
| SEC-06 | Next.js server-action origin check | none | Implemented | Not verified by test |
| SEC-07 | Env only; key id via `api/public-config` | `live.spec.ts` | Tested | No separate test keys yet |
| SEC-08 | — | — | Not Started | Threat model |
| SEC-09 | `ADMIN_PASSWORD` still enabled | — | Not Started | MD-17 |
| NFR-01 | — | — | Not Started | Not measured |
| NFR-02 | — | — | Not Started | Not measured |
| NFR-03 | Advisory lock | none | Implemented (untested) | Concurrency test needed |
| NFR-04 | Vercel only | — | Not Started | Uptime alerting |
| NFR-05 | Supabase defaults (unverified) | — | **Unknown** | R6 |
| NFR-06 | Partial (labels, tap targets) | `site.spec.ts` | Implemented (partial) | No axe audit |
| NFR-07 | Display in Asia/Kolkata; stored `timestamp(3)` UTC | `booking.spec.ts` | Implemented (partial) | `timestamptz` migration |
| NFR-08 | Integer rupees | — | Not Started | R3 |
| NFR-09 | — | — | Not Started | Release checklist |
| NFR-10 | `.github/workflows/third-space.yml` | — | **Failing** | F-01, F-02 |

## Unknown-source requirements

Requirements from Skedda Reports 11 and 12 cannot be listed until the document is supplied. They will be added as `SK11-*` and `SK12-*` rows. Until then they are **Unknown**, not Not Started.

## Coverage summary

| Stage | Count (of 79) |
|---|---|
| Tested (includes PAY-03, which fails in CI) | 35 |
| Implemented (incl. partial) | 27 |
| Not Started | 14 |
| Unknown | 2 (WEB-07, NFR-05) |
| Failing | 1 (NFR-10, CI) |
| Approved / Production Ready | 0 |
