# Phase 2: System architecture

## Sitemap

| Path | Page | Notes |
|---|---|---|
| `/` | Home | Navigation, cinematic hero, Book CTA, Theatre and Studio cards, popular packages, how booking works, gallery, amenities, testimonials, location map, FAQs, footer |
| `/private-theatre` | Private Theatre | Packages behind the Legal Gate (no film offers until rights are verified) |
| `/podcast-studio` | Podcast & Creator Studio | |
| `/book` | Booking engine | Guided 6 steps |
| `/celebrations` | Birthday & Anniversary | |
| `/creator-plans` | Creator Monthly Plans | |
| `/gallery` | Gallery | Admin-managed images |
| `/about` | About THIRD SPACE | By LovBites Hospitality Group |
| `/faqs` | FAQs | |
| `/contact` | Contact | Enquiry form, WhatsApp, map |
| `/my-booking` | My Booking | Find a booking with ID + phone + email, or open the secure link |
| `/privacy`, `/terms`, `/cancellation-refund` | Legal pages | Plus `/policies/*` (18+ pack v2.0) |
| `/admin/*` | Admin | Separate interface with role-based access |

Old URLs (`/watch`, `/create`, `/celebrate`, `/visit`) redirect permanently to the new ones.

## Data model (Postgres, `thirdspace` schema, Prisma migrations)

- **Catalogue (admin-editable)**
  - `Resource`: theatre, studio. Hours, slot step, buffer, booking window, active.
  - `Package`: resource, category, prices, duration rules, max guests, admin-entered inclusions, active, Legal Gate flag, advance %, cancellation rule, plan hours.
  - `AddOn`, `Coupon`.
  - `SharedAsset`, and `PackageAsset` (staff or equipment a package needs).
  - `Closure`: holiday, maintenance, private event per resource (replaces `SlotBlock`).
  - `Setting`: key / JSON for tax, holds, notification timings, minimum charge.
- **Customers:** `Customer` (phone unique), `CreatorMembership` (hours total / used, validity), `MembershipUsage`.
- **Bookings**
  - `Booking`, with statuses: pending_payment → confirmed → checked_in → in_progress → completed; cancelled, refund_pending, refunded, no_show.
  - `Hold`, `PolicyAcceptance`.
- **Money:** `Payment` (order / payment ids unique; kind advance, balance, full or refund; status), `WebhookEvent` (idempotency).
- **Operations**
  - `Lead`, `Incident`, `AuditLog`, `Notification` (outbox).
  - `NotificationTemplate`, `RecordingFile`, `Testimonial`, `GalleryImage`, `StaffUser` (roles), `RateLimit`.
- **Security:** Row Level Security is enabled on every table. The app connects with its own role, which owns the tables. The schema is not exposed through Supabase's REST API.

## Booking logic

1. **Availability for (package, date, duration)**
   - Read the resource's hours, a 30-min start grid, holds, live bookings + buffer, and closures.
   - The time is also blocked if any **shared asset** the package needs is busy in another resource.
   - Dates outside the booking window, holidays and the pre-launch period are "unavailable". Days with no free slot are "fully booked".
2. **Hold:** inside a transaction with a per-resource advisory lock. The status is re-checked and a 15-min hold is inserted.
3. **Checkout**
   - The server recomputes the quote: package, session rules, add-ons, coupon, tax, advance %.
   - It creates the `Booking` as `pending_payment` with the hold kept, plus a Razorpay order (or confirms directly for pay at venue / free).
4. **Payment confirmation:** client callback **or** webhook, whichever comes first, idempotent.
   - Verify the signature, then mark the booking confirmed. Duplicate payments are rejected by unique ids.
   - A payment that arrives after the hold expired becomes `refund_pending` and is flagged.
5. **Manage:** secure token link. The customer can view, download the receipt, request cancellation (refund by tier), and download recording files.

## Payment flow (Razorpay)

1. Browser → `POST /api/checkout`.
2. The server creates a Razorpay order for the advance or full amount and returns the key id.
3. Razorpay Checkout runs (UPI, cards, netbanking).
4. Browser → `POST /api/checkout/confirm`; the server verifies the HMAC.
5. Razorpay → `POST /api/webhooks/razorpay`. The server verifies `X-Razorpay-Signature` with `RAZORPAY_WEBHOOK_SECRET`, then `payment.captured` / `payment.failed` / `refund.processed` update `Payment` and `Booking`.
6. Without keys, the site runs **pay at venue**. It never shows a fake payment.

## Roles (RBAC)

| Role | Can |
|---|---|
| Super Admin | everything, staff and settings |
| Studio Manager | bookings, calendar, packages, add-ons, recordings, customers |
| Booking Manager | bookings, calendar, customers, leads |
| Finance Manager | payments, refunds, coupons, reports |
| Staff | today's schedule, check-in, incidents |

Staff log in with email + password: scrypt hashes, signed session cookie, rate-limited. The old shared `ADMIN_PASSWORD` login is kept only as a bootstrap for the first Super Admin.

## Integrations (all environment-based)

| Integration | Env vars | Without credentials |
|---|---|---|
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Pay at venue |
| WhatsApp Business Cloud API | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, approved template names | Outbox + one-tap wa.me |
| Email (Resend HTTP API) | `RESEND_API_KEY`, `EMAIL_FROM` | Outbox |
| SMS OTP | provider TBD | OTP off |
| Recording storage | Supabase Storage (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) **or** an external link per file | External links with expiring THIRD SPACE download tokens |
| Scheduler | `CRON_SECRET`, called by Vercel Cron (daily on the Hobby plan) or an external cron every 15 min | Reminders are sent when the job runs |

## Deviations from the "preferred" stack (documented, not silent)

- **Supabase Auth → own staff auth.** Staff accounts live in our own table with scrypt and roles. Reasons: this needs no extra public keys or email-provider setup to work today, and it keeps roles in the same database as the audit log. It can be swapped for Supabase Auth later.
- **Supabase Storage:** wired as an adapter, but it needs the service-role key, which only the owner can provide. Until then, files are delivered as external links behind expiring tokens.

## Assumptions (to be confirmed by the owner)

1. Package inclusions are **not invented**. Only items the owner stated are seeded ("unlimited popcorn and cold drink", "recording + agreed raw-file delivery", "decoration / refreshments as quoted", "theatre + unlimited food + popcorn and cold drink", "only space", "8 hours and outputs"). Admin adds the rest.
2. Resource for celebrations = Private Theatre room (the owner's table lists them under Private Theatre).
3. Opening hours 10:00–22:00, slot step 30 min, buffer 30 min (owner), setup 30 min (owner), hold 15 min, booking window 60 days, GST 18 % added on top, advance 50 % once Razorpay is live. All are editable in admin.
4. Refund tiers 90 / 50 / 0 % of the advance (from the audit pattern). Editable; the owner must approve them.
5. No testimonials or gallery photos are shown until real ones are added. Sections stay hidden when empty, rather than showing fake content.
