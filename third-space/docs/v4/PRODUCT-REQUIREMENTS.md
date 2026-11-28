# THIRD SPACE: Product Requirements Document (V4.0, Phase 0 draft)

**Status:** Requirements Defined. Awaiting owner approval (Gate 0).
**Applies to:** `third-space/` (custom Next.js modular monolith, PostgreSQL, Razorpay, Asia/Kolkata, INR).

**Source keys** (every requirement cites one or more):

| Key | Source | Evidence class |
|---|---|---|
| V4 | THIRD SPACE V4.0 Master Product Engineering Prompt (2026-11-23) | Documented |
| MP | Master Project Prompt "Premium Studio & Private Experience Booking Management System" (2026-11-20) | Documented |
| OWN-n | Owner decisions in chat (dates listed in `DECISION-REGISTER.md`) | Documented |
| POL | Policy pack v2.0 PDFs (00–04) and the Mandatory Customer Declaration | Documented |
| BP | Competitor Audit + Super Website Blueprint PDF | Documented |
| PVA | Perfect Venue design audit, `docs/audit/` (browser-measured) | Measured |
| SK11 / SK12 | Skedda audit Report 11 / Report 12 | **Unknown: document missing** |

**Priority:** P0 is needed for the V1 launch; P1 is important operations (V1.1); P2 is future (V1.2 / V2). The release mapping is V4 §6.

---

## 1. Product objectives

1. Let guests in Dhanbad discover, price, book and pay for the Private Theatre and the Podcast & Creator Studio without staff involvement, with no double bookings. (V4 Target, MP)
2. Give the owner one system for reservations, resources, customers, payments, refunds, credits and reporting, with an audit trail. (V4 Owner outcome)
3. Give staff a daily operational tool: today's sessions, check-in, preparation and reset. (V4 Staff outcome)
4. Keep the venue legally safe: 18+ declaration, recording consent separate from marketing consent, Legal Gate for film content. (POL, MP)

**Non-goals for V1:** recurring subscriptions with auto-charge (V4 Phase 8), multi-location (V2), a native mobile app (V4 locked decision: responsive web).

## 2. Personas

| Persona | Needs | Device |
|---|---|---|
| Couple or family guest (theatre, celebration) | Price up front, a free slot, theme and food add-ons, quick payment, confirmation on WhatsApp | Phone (390–430px) |
| Creator / podcaster | Hourly studio time, equipment, operator, files after the session, prepaid hours | Phone and laptop |
| Corporate / business interview client | Custom package, invoice | Laptop |
| Owner / Super Admin | Revenue, occupancy, approvals, settings | Laptop and phone |
| Manager / Booking executive | Manage bookings, calls, walk-ins, reschedules | Laptop |
| Studio or theatre operator (staff) | Today's list, check-in, equipment and room checklists, session status | Phone or tablet |
| Finance staff | Payments, refunds, reconciliation, exports | Laptop |

## 3. Business rules (current, owner-confirmed unless marked otherwise)

| ID | Rule | Source | Class |
|---|---|---|---|
| BR-01 | Booked time = work time (movie runtime, episodes, reels or hours) + 30 min setup. No rounding. | OWN-3 (19 Nov) | Documented |
| BR-02 | 30-minute gap kept free after every booking, shown to the guest. | OWN-3 | Documented |
| BR-03 | Lowest price of any booking is ₹799, before add-ons and GST. | OWN-4 | Documented |
| BR-04 | Launch packages: Private Cinema 2h ₹1,699 · Premium 2h ₹2,699 · Podcast/Content 2h ₹1,899 · Birthday/Anniversary ₹2,499+ · Family 3h ₹6,999 · Small Private Celebration 1h ₹799 · Monthly Creator Plan ₹4,999 / 8h. **V4 marks these as draft until re-approved.** | OWN-5 (image, 19 Nov), V4 Phase 6 | Documented |
| BR-05 | GST 18% on base + add-ons. | Seed setting | **Inferred: confirm** |
| BR-06 | Advance 50% online; balance at the venue. Pay-at-venue while there are no Razorpay keys. | Seed setting | **Inferred: confirm** |
| BR-07 | Refund tiers on the advance: ≥72h 90%, ≥24h 50%, <24h 0%. | Seed setting | **Inferred: confirm** |
| BR-08 | Self-reschedule: once per booking, ≥24h before start, same package and length. | Assumption (2026-11-20) | **Proposed: confirm** |
| BR-09 | Theatre and Studio are booked independently. Shared staff or equipment can link packages. | V4 locked decisions, MP | Documented |
| BR-10 | 18+ venue. Every booking requires the Mandatory Customer Declaration (exact text, versioned). | POL | Documented |
| BR-11 | Recording consent is separate from marketing consent. Recordings are never published automatically. | POL, MP, V4 Phase 10 | Documented |
| BR-12 | Film screenings are hidden until the Legal Gate is opened (licences). | MP, OWN | Documented |
| BR-13 | Checkout hold lasts 15 minutes. | Seed setting | **Inferred: confirm** |
| BR-14 | Opening hours 10:00–22:00 daily, both spaces. | Seed setting | **Inferred: confirm** |

## 4. Functional requirements

Columns: ID · Requirement · Business purpose · Priority · Dependencies · Acceptance criteria · Source.

### 4.1 Public website (WEB)

| ID | Requirement | Purpose | P | Deps | Acceptance criteria | Source |
|---|---|---|---|---|---|---|
| WEB-01 | Home, Private Theatre, Podcast & Creator Studio, Packages & Pricing, Gallery, About, Contact, FAQs, Privacy, Terms pages | Discovery and SEO | P0 | DS-01 | Every page returns 200, has one H1, meta title and description, and passes the content checker (no placeholders, consistent contact details, no dead links). | V4 Ph3-A, MP |
| WEB-02 | Prices shown come only from the admin catalogue | Avoid stale prices | P0 | BKG-10 | Changing a package price in admin changes `/pricing` and home within 30s; no hard-coded prices in pages. | V4 Ph6, MP |
| WEB-03 | Legal Gate hides all film/screening offers when closed | Licence compliance | P0 | – | With the gate closed, no page, meta tag, RSC payload or sitemap entry contains screening terms. | MP, BR-12 |
| WEB-04 | Bilingual copy (English, Hinglish) toggle | Local audience | P1 | – | Toggle switches copy and persists. | BP |
| WEB-05 | Responsive at 1440, 1280, 1024, 768, 390 and 360px | Mobile-first | P0 | DS-01 | No horizontal scroll and tap targets ≥44px at all six widths. | V4 Ph12 |
| WEB-06 | Visual design follows the approved design system | Brand consistency | P0 | DS-01 | Screens use only design tokens and shared components. | V4 Ph2 |
| WEB-07 | Pixel specification from Skedda Report 11 | Visual fidelity | **Unknown** | Source document | Cannot be defined until Report 11 is provided. | SK11 |

### 4.2 Customer portal (CUS)

| ID | Requirement | Purpose | P | Deps | Acceptance criteria | Source |
|---|---|---|---|---|---|---|
| CUS-01 | Registration and login (mobile or email + password); profile edit | Repeat guests | P0 | SEC-01 | Signup claims past bookings only when the email matches; wrong password is refused; rate-limited. | V4 Ph3-B |
| CUS-02 | Service → package → session details → date (calendar) → slot → add-ons → details → consent → payment → confirmation | Self-service booking | P0 | BKG-01..08, PAY-01..04 | A guest completes a booking end-to-end on a 390px phone; the total shown equals the server total. | V4 Ph3-B, MP |
| CUS-03 | My Bookings: upcoming, past, receipt, files | Self-service | P0 | CUS-01 | Signed-in guest sees all bookings for their phone; guest without an account uses booking ID + phone + email. | V4 |
| CUS-04 | Cancel online with the refund tier applied | Fewer calls | P0 | FIN-04 | Cancellation sets `refund_pending` (if a refund is due) or `cancelled`; slot freed; message queued. | V4 |
| CUS-05 | Reschedule online to a free slot | Fewer calls | P1 | BKG-01, BR-08 | Move succeeds only to a free slot; rules from admin settings; counted; audited; message queued. | V4 |
| CUS-06 | Credit balance and membership history | Creator retention | P1 | CRD-01 | Dashboard shows purchased, used and remaining hours and expiry from the ledger. | V4 Ph3-B, Ph8 |
| CUS-07 | Feedback after the session with separate publish consent | Social proof | P1 | OPS-01 | Opens only after check-in, once per booking; publishing needs guest consent and staff approval. | V4 Ph9 |

### 4.3 Booking engine (BKG)

| ID | Requirement | Purpose | P | Deps | Acceptance criteria | Source |
|---|---|---|---|---|---|---|
| BKG-01 | Server-side availability per resource (hours, slot step, buffer, booking window, closures) | Correct slots | P0 | DB-01 | API returns only slots that are free on the server; frontend never decides availability. | V4 Ph4–5 |
| BKG-02 | Atomic holds with expiry (15 min) | No race at checkout | P0 | BKG-01 | Two simultaneous hold requests for overlapping time: exactly one succeeds (automated concurrency test). | V4 Ph4 |
| BKG-03 | **Database-level** overlap prevention for exclusive resources | Defence in depth | P0 | DB-03 | An exclusion constraint rejects an overlapping live booking even via direct SQL. | V4 Ph4 |
| BKG-04 | Resources: theatre room, studio, cameras, microphones, equipment, staff as independent resources | Correct capacity | P1 | DB-02 | A booking can require several resources; any unavailable resource blocks the slot; staff/equipment availability editable. | V4 Ph5 |
| BKG-05 | Booking state machine with explicit transitions: Draft → Held → Pending Payment → Confirmed → Checked In → In Progress → Completed, plus Hold Expired, Payment Failed, Cancelled, Refund Pending, Refunded, No Show | Integrity | P0 | DB-01 | Invalid transitions are rejected server-side; every transition is audited (unit tests per transition). | V4 Ph5 |
| BKG-06 | Theatre: fixed-duration and runtime-based sessions; capacity; package + add-ons | Theatre ops | P0 | BKG-01 | Runtime of the licensed title + 30 min decides time and price. | V4, OWN-3 |
| BKG-07 | Studio: hourly sessions, multiple durations, equipment, operator and editing add-ons | Studio ops | P0 | BKG-04 | Episodes/reels decide time; add-ons priced from the catalogue. | V4, OWN-3 |
| BKG-08 | Month calendar shows available, full and unavailable days | Faster choice | P0 | BKG-01 | Calendar API status matches the slot API for each day. | MP |
| BKG-09 | Staff create, move and cancel bookings through the same engine | Phone/walk-in bookings | P0 | BKG-02 | Manual booking and admin reschedule use the same locks; cannot double-book. | MP |
| BKG-10 | Admin-configurable packages, add-ons, coupons, resources, closures | No developer for changes | P0 | – | Edits apply within 30s; audited. | MP |

### 4.4 Payments (PAY) and finance (FIN)

| ID | Requirement | Purpose | P | Deps | Acceptance criteria | Source |
|---|---|---|---|---|---|---|
| PAY-01 | Server-side Razorpay order creation; secrets never sent to the browser | Security | P0 | Keys | Order created only by the server; key secret absent from all client bundles. | V4 Ph7 |
| PAY-02 | Checkout signature verification on the server | Trust | P0 | PAY-01 | Booking confirms only after HMAC verification; forged signature rejected (test). | V4 Ph7 |
| PAY-03 | Webhook HMAC verification + idempotency (event id) | Duplicate safety | P0 | PAY-01 | Bad signature returns 400; replayed event is ignored; no duplicate payment rows (test). | V4 Ph7 |
| PAY-04 | Payment status separate from booking status | Correctness | P0 | BKG-05 | A payment can be captured while the booking is refund-pending (slot lost) and vice versa. | V4 Ph7 |
| PAY-05 | Delayed and failed payment handling; hold expiry → booking released; late capture → refund pending | Edge cases | P0 | PAY-03 | Automated tests for a late webhook after hold expiry and for a failed payment. | V4 Ph7 |
| PAY-06 | Reconciliation job comparing app payments with Razorpay orders and payments | Finance accuracy | P1 | PAY-01 | Daily job lists mismatches; mismatch report in admin. | V4 Ph7 |
| PAY-07 | Refunds via the Razorpay refunds API (full and partial); complete only on gateway confirmation | Finance | P1 | PAY-01, FIN-01 | Refund request creates a pending refund; `refund.processed` webhook completes it. | V4 Ph7 |
| PAY-08 | Advance and remaining balance; balance collected at the venue recorded | Ops | P0 | FIN-01 | Booking shows paid / due; staff record the balance with method. | V4 Ph6 |
| PAY-09 | Payment receipts | Guest trust | P0 | – | Printable receipt per booking with line items, GST and paid / due. | V4 Ph7 |
| FIN-01 | Double-entry financial ledger in integer paise | Auditability | P0 | DB-04 | Every money movement (charge, payment, refund, discount, credit purchase) creates balanced ledger entries; never deleted. | V4 Ph6–7 |
| FIN-02 | Pricing snapshot on confirmation (package, add-ons, tax, discounts) | History integrity | P0 | FIN-01 | Changing a price later does not change existing bookings or receipts. | V4 Ph6 |
| FIN-03 | Tax configuration (GST rate, inclusive or exclusive) | Compliance | P0 | – | GST computed per line with documented rounding; matches receipt. | V4 Ph6 |
| FIN-04 | Refund rules engine (tiers configurable) | Policy | P0 | BR-07 | Refund amount = tier × eligible paid amount; unit tests per tier boundary. | V4 Ph6 |
| FIN-05 | Invoices (GST invoice numbering) | Corporate clients | P1 | FIN-01, MD-08 | Sequential, gap-free invoice numbers; downloadable PDF. | V4 Ph4 entities |
| FIN-06 | Coupons and discount rules | Promotions | P0 | FIN-01 | Usage limits enforced atomically; discount in the ledger. | MP |

### 4.5 Credits and memberships (CRD)

| ID | Requirement | Purpose | P | Deps | Acceptance criteria | Source |
|---|---|---|---|---|---|---|
| CRD-01 | Credit wallet with ledger (purchase, consume, restore, adjust, expire) | Prepaid hours | P1 | FIN-01 | Balance = sum of ledger; DB constraint prevents negative balance; duplicate deduction prevented by a unique key per booking. | V4 Ph8 |
| CRD-02 | Booking paid with credits | Creator convenience | P1 | CRD-01, BKG-05 | Booking with credits deducts atomically; cancellation restores. | V4 Ph8 |
| CRD-03 | Separate prepaid packages from recurring subscriptions; no auto-charge | Compliance | P2 | – | No recurring charge exists without explicit authorisation. | V4 Ph8 |

### 4.6 CRM and messaging (CRM)

| ID | Requirement | Purpose | P | Deps | Acceptance criteria | Source |
|---|---|---|---|---|---|---|
| CRM-01 | Customer database with booking and purchase history, notes, preferences | Repeat business | P0 | – | Customer page lists all bookings, payments and notes. | V4 Ph9 |
| CRM-02 | Consent records (marketing, recording, WhatsApp opt-in/out) with timestamps | Legal | P0 | – | Every consent change is stored with time and source; opt-out stops marketing messages. | V4 Ph9, POL |
| CRM-03 | WhatsApp Business Platform messages (confirmation, payment, reminder, cancellation, reschedule, feedback, membership) with templates, delivery status and failures | Communication | P1 | Provider (MD-10) | Each message has status sent/delivered/failed; failure visible in admin. | V4 Ph9 |
| CRM-04 | Email copies | Communication | P1 | Provider | Same events by email. | MP |
| CRM-05 | Data deletion / anonymisation on request | Privacy | P0 | – | Anonymise removes personal data, keeps financial records. | POL |

### 4.7 Operations and staff (OPS)

| ID | Requirement | Purpose | P | Deps | Acceptance criteria | Source |
|---|---|---|---|---|---|---|
| OPS-01 | Guest check-in with 18+ verification count (no ID numbers stored) | Legal | P0 | – | Check-in refuses without the ID confirmation; only counts stored. | POL |
| OPS-02 | Session status: start, complete, no-show | Ops | P0 | BKG-05 | Status buttons follow the state machine. | V4 Ph10 |
| OPS-03 | Staff dashboard: today, upcoming, assigned tasks | Daily ops | P1 | SEC-02 | Operator sees only their assigned bookings and tasks. | V4 Ph3-D |
| OPS-04 | Room preparation, equipment and reset checklists per booking | Quality | P1 | OPS-03, DB-02 | Checklist items configurable per resource; completion stored with staff and time. | V4 Ph3-D, Ph10 |
| OPS-05 | Incident / complaint register | Safety | P0 | – | Incidents linked to bookings with updates. | POL |
| OPS-06 | Recording delivery: access-controlled files, download limits, retention and deletion | Privacy | P1 | Storage (MD-11) | Files only with the booking's private token; expiry enforced; deletion after retention. | V4 Ph10 |
| OPS-07 | Two-space schedule view with holds, closures and buffers | Planning | P0 | BKG-01 | Shows both spaces; expired holds not shown as busy. | MP |

### 4.8 Admin and reporting (ADM)

| ID | Requirement | Purpose | P | Deps | Acceptance criteria | Source |
|---|---|---|---|---|---|---|
| ADM-01 | Executive dashboard (today, revenue, occupancy, readiness) | Owner overview | P0 | FIN-01 | Figures match the ledger and bookings. | V4 Ph3-C |
| ADM-02 | Booking management (search, filter, sort, CSV) | Ops | P0 | – | Filters combine; CSV matches the filter. | MP |
| ADM-03 | Theatre calendar and studio calendar | Ops | P0 | OPS-07 | Separate and combined views. | V4 |
| ADM-04 | Reports: revenue, occupancy, package mix, payments, refunds | Business insight | P1 | FIN-01 | Totals reconcile with the ledger. | V4 |
| ADM-05 | Settings (tax, advance, hold, minimum, refund tiers, reschedule rules) | Config | P0 | – | Changes audited; applied to the next booking. | MP |
| ADM-06 | Audit log of every admin and guest state change | Accountability | P0 | – | Every write action has an audit row; no personal data in details. | V4 Ph11 |

## 5. Security and privacy (SEC)

| ID | Requirement | P | Acceptance criteria | Source |
|---|---|---|---|---|
| SEC-01 | Secure authentication (scrypt hashes, signed httpOnly cookies, session expiry) for staff and customers | P0 | Passwords never stored in plain text; cookies httpOnly + secure in production. | V4 Ph11 |
| SEC-02 | RBAC, least privilege, server-side checks on every page, action and API | P0 | Denied role gets a redirect or 403 on page and export (tests per role). | V4 Ph11 |
| SEC-03 | Role set: Super Admin, Business Owner, Manager, Booking Executive, Studio Operator, Theatre Operator, Finance, Customer | P1 | Mapping from the current 5 roles approved (MD-06). | V4 Ph11 |
| SEC-04 | Input validation (Zod) on all inputs; parameterised queries only | P0 | No raw SQL with interpolated user input. | V4 |
| SEC-05 | Rate limiting on login, OTP, lookup, checkout, coupons, feedback | P0 | Limits enforced in the DB-backed limiter. | V4 |
| SEC-06 | CSRF protection for cookie-authenticated mutations | P0 | Server actions rely on the framework origin check; JSON APIs reject cross-origin requests. | V4 |
| SEC-07 | Secrets only in environment variables; separate test and live Razorpay keys | P0 | No secret in git; live keys only in Production. | V4 Ph13 |
| SEC-08 | Threat model (OWASP ASVS-oriented) | P1 | `SECURITY-AND-PRIVACY.md` with threats, mitigations and residual risk. | V4 Ph11 |
| SEC-09 | Remove or restrict the shared bootstrap owner password once staff accounts exist | P1 | Bootstrap login can be disabled by setting. | Phase 0 finding |

## 6. Non-functional requirements (NFR)

| ID | Requirement | Target | P |
|---|---|---|---|
| NFR-01 | Page performance (mobile, 4G) | LCP ≤ 2.5s, CLS ≤ 0.1 on home, book and pricing (to be measured) | P1 |
| NFR-02 | API latency | Availability API p95 ≤ 300ms at 20 concurrent users (to be measured) | P1 |
| NFR-03 | Concurrency | 50 parallel hold attempts on one slot → exactly 1 success | P0 |
| NFR-04 | Availability | Hosting SLA of the platform; uptime alerting | P1 |
| NFR-05 | Backup and recovery | RPO ≤ 24h, RTO ≤ 4h (proposed); restore drill documented | P0 |
| NFR-06 | Accessibility | WCAG 2.1 AA on primary journeys | P1 |
| NFR-07 | Time | All business times in Asia/Kolkata; stored timezone-aware | P0 |
| NFR-08 | Money | Integer paise everywhere in storage and calculation | P0 |
| NFR-09 | Release criteria | V4 Phase 12 mandatory list (no conflict, no unverified confirmation, no duplicate financial entry, no unauthorised access, no broken primary journey, no critical responsive failure) | P0 |
| NFR-10 | CI must be green before deployment | Every merge blocked on CI | P0 |

## 7. Workflows (summaries; diagrams in `TECHNICAL-ARCHITECTURE.md`)

- **Customer booking:** choose experience → package → session → calendar day → slot (hold) → details (+OTP when enabled) → add-ons/coupon → declaration and consents → pay (Razorpay) or confirm (venue) → confirmation, receipt, WhatsApp.
- **Staff day:** schedule → preparation checklist → check-in (18+ count, balance) → start → complete → reset checklist → feedback request (cron).
- **Payment:** order → checkout → signature verify → confirm; in parallel the webhook → idempotent confirm; daily reconciliation; refunds by API → webhook completes them.
- **Credits:** buy plan → ledger credit → book with credits (atomic debit) → cancel (restore) → expiry job.
