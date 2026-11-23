# Product requirements (V5.0)

Source of truth for requirement IDs, priorities and acceptance criteria: `docs/v4/PRODUCT-REQUIREMENTS.md` (79 requirements) and the traceability matrix `docs/v4/REQUIREMENTS-TRACEABILITY.md` (written before this release; its stage column predates the V5 work, so this file and PROJECT_STATUS are current). This page is the consolidated V5 view: feature inventory, journeys, roles, rules and screens.

Status words: **Implemented** (code exists), **Tested** (automated test passes), **Verified** (observed in the live deployment), **Production-configured**, **Live**. Nothing in this product is Production-configured for payments or messaging.

## Feature inventory by business module

| # | Module | Implemented | Tested | Verified live | Not built or blocked |
|---|---|---|---|---|---|
| 1 | Private Cinema / Theatre | Yes (hidden by Legal Gate until licences) | e2e both gate states | Gate closed on live | Licences (owner) |
| 2 | Premium experiences | Yes | e2e | Pricing page | |
| 3 | Podcast Studio | Yes | e2e | Pricing and availability | |
| 4 | Content Creation Studio | Yes | e2e | Pricing | |
| 5 | Birthday / Anniversary | Yes | e2e | Pricing | |
| 6 | Family and group | Yes | e2e (pricing page) | Pricing | |
| 7 | Small private celebration | Yes | e2e | Pricing | |
| 8 | Creator memberships and prepaid hours | Plan purchase, ledger, staff usage and adjustment, expiry, cancel reversal | DB tests | | Pay normal bookings with credits online; plan purchase online needs Razorpay |
| 9 | Customer accounts and history | Signup, login, logout, password reset, profile, bookings, plan balance, booking details with payment and refund lines | e2e | | Customer notification history; "cancellation request" (cancel is immediate when allowed) |
| 10 | Staff operations | `/staff` portal | e2e | Deployed | Separate checklists beyond room ready |
| 11 | Admin dashboard | Today, bookings, calendar, schedule, catalogue, customers, payments, reports, settings, staff, audit, exports | e2e | Deployed | Resource utilisation chart beyond schedule occupancy |
| 12 | Payments, refunds, reporting | Razorpay orders, signature, webhook, refund API, reconciliation, manual venue payments, CSV exports | Service tests with a fake gateway | | Real Razorpay run; invoices; ledger of all money movements (only credits have a ledger) |
| 13 | CRM and communication | Customer profiles, history, notes, consent flags, leads, notification outbox and history in admin | e2e | | Segmentation beyond filters; WhatsApp, email, SMS **not connected** (no provider) |
| 14 | Resource, room and staff scheduling | Two resources with independent calendars, buffers, closures, shared assets, staff assignment | e2e, DB tests | | Equipment and staff as first-class bookable resources |

## Primary journeys (all covered by e2e unless noted)

1. Guest: home → service → package → session details → date → slot (hold) → details and 18+ declaration → pay online (mock) or confirm pay-at-venue → confirmation with booking ID → My Booking / account.
2. Guest: reschedule or cancel (refund tier applied); give feedback after the session.
3. Customer: signup (claims history only with the matching email) → account → forgot and reset password.
4. Admin: sees the booking, assigns staff, records balance, cancels with a refund, issues the refund (test only), exports CSV.
5. Staff: sees the day, marks room ready, checks guests in (18+), runs and completes the session, notes, reports an issue.
6. Plan: confirmed plan booking creates the plan and its first session in the ledger; staff record usage and adjustments.

## Roles and permissions (`src/server/admin/auth.ts`)

| Permission | Super Admin | Studio Manager | Booking Manager | Finance Manager | Staff |
|---|:-:|:-:|:-:|:-:|:-:|
| dashboard | ✔ | ✔ | ✔ | ✔ | ✔ |
| bookings.view | ✔ | ✔ | ✔ | ✔ | ✔ |
| bookings.manage (cancel, reschedule, assign, manual booking) | ✔ | ✔ | ✔ | | |
| checkin (staff portal, room ready, start, complete) | ✔ | ✔ | ✔ | | ✔ |
| incidents | ✔ | ✔ | ✔ | | ✔ |
| calendar, customers | ✔ | ✔ | ✔ | customers only | |
| memberships | ✔ | ✔ | ✔ | | |
| packages, content, recordings, reports, audit | ✔ | ✔ | | reports, audit | |
| leads, notifications | ✔ | ✔ | ✔ | | |
| payments, coupons (refunds, exports) | ✔ | | | ✔ | |
| staff, settings | ✔ | | | | |

Customers have a separate account system and see only their own records. The V4 eight-role model is **not** built (MD-06).

## Rules (current defaults; see ASSUMPTIONS_AND_DECISIONS)

- **Booking:** server-validated slots; 15-minute hold; 30-minute setup and 30-minute gap; no overlap (engine and database); coupons counted atomically; declaration required.
- **Payment:** advance 50% online (when Razorpay is on), balance at venue; money in paise; booking confirmed only by verified payment; failed payment never confirms; payment status separate from booking status.
- **Cancellation and refund:** guest cancel applies tiers (72 h: 90%, 24 h: 50%, below: 0%) to the advance; staff can set another amount with a reason; refund goes through the gateway when an online payment exists, or is recorded manually.
- **Credits:** append-only ledger; no negative balance; expiry writes off the remainder; cancellation restores consumed minutes once.
- **Privacy:** recording consent separate from marketing consent; recordings never published automatically; staff see only the customer data needed to run a booking (no email, no payment detail beyond balance due).

## Screens

Public: home, about, private theatre, podcast studio, creative studio, celebrations, pricing, creator plans, gallery, FAQs, contact, visit, book, booking confirmation, My Booking (find and manage), feedback, policies (index and each), terms, privacy, cancellation and refund, two Dhanbad SEO pages. Customer: signup, login, forgot password, reset password, account. Staff: today, booking detail. Admin: login, today, bookings (list, new, detail), schedule, calendar, customers (list, detail), packages (list, new, edit), add-ons, coupons, payments, creator plans, recordings, reports, titles, incidents (list, new, detail), leads, messages, gallery and reviews, staff accounts, settings, policies, audit log, CSV exports.

## Out of scope for this release (and why)

Invoices (needs GSTIN), WhatsApp/SMS/email live delivery (no provider), live payments (no keys), 8-role model (needs owner mapping), native apps (locked: responsive web), Skedda-derived visual specification (document missing).
