# THIRD SPACE — Admin user guide

Login: `/admin/login`. Staff log in with their email and password. The owner can always log in with any name plus `ADMIN_PASSWORD` (Super Admin) — use that first to create staff accounts under **Staff**.

## Roles
| Role | Can do |
|---|---|
| Super Admin | everything, incl. staff accounts, settings, payments, audit |
| Studio Manager | bookings, calendar, packages, customers, memberships, recordings, content, reports, audit |
| Booking Manager | bookings, check-in, calendar, customers, memberships, incidents, leads, notifications |
| Finance Manager | payments, refunds, coupons, reports, CSV exports |
| Staff | dashboard, view bookings, check-in, incidents |

A page a role cannot open sends them back to the dashboard with "Your role cannot open that page."

## Daily work
- **Dashboard** — today's bookings, KPIs and the go-live readiness list (what is still not configured).
- **Bookings** — search / filter / sort, open a booking to: check in (18+ verified count only), start / complete the session, record a venue payment, manually confirm a pending payment, reschedule, cancel (refund tier is computed), mark refunded, attach a recording link. **New booking** creates phone / walk-in bookings through the same slot engine (no double booking). **Export CSV** downloads the filtered list.
- **Calendar** — opening hours and buffer per space, holidays / maintenance / private events (closures), shared equipment between spaces.
- **Packages / Add-ons / Coupons** — the catalogue. Changes appear on the website within ~30 seconds. Never add inclusions you do not actually provide.
- **Customers** — history per guest; *Anonymise* removes personal data on request (booking and payment rows stay for accounts).
- **Payments** — every order, payment and refund; CSV export.
- **Memberships** — creator plan hours used / left; log usage after each session.
- **Recordings** — delivery links per booking; guests open them from My Booking with their private booking link. Revoke at any time.
- **Content** — testimonials (only real ones, with source) and gallery photos. Home page sections stay hidden while empty.
- **Notifications** — message queue, provider status and reminder timing.
- **Reports** — revenue, occupancy, package mix, CSV exports.
- **Incidents, Leads, Titles, Policies, Audit** — as before; every admin action is written to the audit log.

## Guests
Guests manage bookings at `/my-booking` (booking ID + phone + email), print the receipt, download the declaration and cancel online; refunds follow the published tiers.
