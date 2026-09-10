# RepairFlow — Laptop & Computer Service Center OS

RepairFlow connects customer intake, device diagnosis, estimates, repair
tracking, inventory/procurement, payments and WhatsApp customer updates into
one system for a laptop & computer service center — so a laptop's whole
journey from drop-off to delivery lives in one place instead of a notebook,
a WhatsApp thread and someone's memory.

## Stack

- **Next.js 16** (App Router) + **TypeScript**, Tailwind CSS v4
- **Prisma** ORM on **SQLite** for zero-config local persistence (see
  [Moving to production Postgres](#moving-to-production-postgres) to switch)
- Cookie-based session auth (JWT via `jose`, bcrypt password hashing) with
  four roles: Admin, Service Manager, Technician, Front Desk
- WhatsApp via free `wa.me` deep links by default, with an optional Twilio
  WhatsApp API integration for fully automatic sending
- `recharts` for the dashboard revenue chart, `qrcode` for the invoice/status
  QR code, `sonner` for toasts, `lucide-react` for icons

## Getting started

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db and applies the schema
npm run db:seed          # realistic demo data across every module
npm run dev
```

Open http://localhost:3000 — you'll land on the login page.

### Demo logins (development only)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@repairflow.demo` | `Admin@123` |
| Service Manager | `manager@repairflow.demo` | `Manager@123` |
| Technician | `tech@repairflow.demo` | `Tech@123` |
| Front Desk | `frontdesk@repairflow.demo` | `Front@123` |

These are also shown on the login screen behind a "Demo credentials"
disclosure. **Remove or change them before any real deployment** — see
[Production readiness](#production-readiness-checklist).

## Environment variables

Copy `.env.example` to `.env` and adjust:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file path (`file:./dev.db` by default) |
| `AUTH_SECRET` | Signs session JWTs — set a long random value in production |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_FROM` | Optional — enables fully automatic WhatsApp sending (see below). Also settable from the app at **Settings → Integrations**, which takes precedence. |
| `NEXT_PUBLIC_APP_URL` | Base URL used to build the customer status link and its QR code |

## WhatsApp integration

There is no fake WhatsApp integration here — every "send" button does one of
two real things:

1. **Default, zero-setup:** builds the real message text from the job's data
   and opens a `wa.me` deep link with it pre-filled, which opens the staff
   member's own WhatsApp (mobile or Web) with the message ready to send. One
   tap to actually send it. This costs nothing and needs no API keys.
2. **Optional, fully automatic:** if Twilio WhatsApp API credentials are set
   (env vars or **Settings → Integrations**), the same message is sent
   server-side via Twilio with no click required — used for the "auto-notify
   on status change" setting.

Every message sent either way is logged against the job (Communication tab)
with its status (`SENT`, `FAILED`, `LINK_OPENED`), so there's a full audit
trail of what was actually communicated to the customer, when, and by whom.
Templates (Job Received, Estimate Sent, Ready for Pickup, Payment Reminder,
Status Check Link, etc.) are editable at **Settings → WhatsApp Templates**.

## What's implemented

- **Auth & roles** — 4 roles enforced both in middleware (page access) and
  inside every API route (never trust the client alone)
- **Customers & devices** — CRM with service history, duplicate prevention
  by mobile number, multi-device customers
- **Service jobs** — full intake wizard (customer → device → condition
  checklist & accessories → complaint), a 17-status engine with validated
  transitions, human-readable `JOB-YYYY-#####` IDs, and a full audit trail
- **Diagnosis & estimates** — line-item estimates (parts/labour/service),
  send/approve/reject/need-more-time flow, customer-facing status timeline
- **Inventory** — parts with categories, low/critical/out-of-stock levels,
  stock movement ledger, parts-to-job consumption that decrements stock live
- **Suppliers & purchasing** — multi-supplier price comparison per part,
  purchase orders that increase stock on receipt
- **Payments & invoicing** — advance/partial/final payments, an
  auto-synced invoice, a printable invoice with a QR code to the live status
  page, auto-issued warranty on delivery
- **Reports** — service, financial, inventory and technician performance,
  each computed live from the database
- **WhatsApp** — see above
- **Customer status portal** — `/status/[token]`, no login required, mobile
  first, shows only what a customer should see (no internal notes/diagnosis)
- **Notifications** — a live-alerts feed (low stock, payment pending,
  delayed jobs, warranty expiring — always current, not stale) plus an
  event feed (new job, approval needed, ready for delivery)
- **Admin** — team management, a full audit log, company/WhatsApp/tax/
  warranty settings

## Known limitations

Being upfront about what's simplified rather than pretending otherwise:

- **Device photos**: the schema and UI tab exist, but there's no upload
  endpoint yet — wire `DevicePhoto` + a multipart upload route to
  `public/uploads` (or S3/Supabase Storage in production) to finish this.
- **No automated tests**: manual QA was done via API smoke tests and a
  Playwright visual pass across desktop/mobile for every page (see below);
  there's no test suite checked in.
- **Prisma CLI dev-dependency advisory**: `npm audit` flags a transitive
  `deepmerge-ts` advisory pulled in by the `prisma` CLI's config loader. It
  affects local tooling only (not `@prisma/client`, which is what actually
  ships in the app), so it isn't a runtime attack surface — but a future
  Prisma upgrade should clear it.
- **Single-tenant**: built for one service center. Multi-branch/multi-tenant
  would need a `Location`/`Branch` model and scoping throughout.
- **SQLite**: great for a single-writer deployment; move to Postgres (see
  below) before running with concurrent writers at real traffic.

## Moving to production Postgres

The schema was written to be Postgres-compatible from day one:

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to
   `provider = "postgresql"` under `datasource db`.
2. Point `DATABASE_URL` at your Postgres instance (Supabase, RDS, etc).
3. `npx prisma migrate dev` to generate a fresh Postgres-native migration
   (SQLite and Postgres migrations aren't binary compatible, so this
   regenerates them — it does not affect your schema definitions above).
4. Re-run `npm run db:seed` if you want the demo data there too.

## Production readiness checklist

- [ ] Replace `AUTH_SECRET` with a long random value; never commit `.env`
- [ ] Remove or disable the demo accounts seeded above
- [ ] Move off SQLite to Postgres for concurrent-write safety (see above)
- [ ] Configure real Twilio credentials if automatic WhatsApp sending is
      wanted, or confirm the `wa.me` flow is acceptable
- [ ] Wire device photo upload to durable storage (S3/Supabase Storage)
- [ ] Put the app behind HTTPS (session cookies are marked `secure` in
      production, so plain HTTP will silently break login)
- [ ] Set `NEXT_PUBLIC_APP_URL` to the real public domain (used in
      WhatsApp status links and the invoice QR code)
- [ ] Review `Settings → Company Profile` (GST number, prefixes, tax %,
      warranty defaults) before issuing real invoices

## Project structure

```
prisma/schema.prisma       Full data model (24 models) + seed script
src/lib/                   Auth, permissions, constants, validation, whatsapp,
                            reports, dashboard data, Prisma client singleton
src/middleware.ts          Route-level auth + role gating
src/app/api/                Route handlers — every mutation validated with zod,
                            every response passing through a consistent error shape
src/app/(auth)/login        Public login
src/app/(app)/              Authenticated app shell (sidebar + topbar) and pages
src/app/status/[token]      Public, no-login customer status portal
src/components/             UI primitives (button/card/field/modal/…),
                            the job detail view, jobs table, charts
```

## QA performed this session

- `npm run build` — 0 TypeScript errors, 0 build errors, all 39 routes
  compiling cleanly
- `npm run lint` — 0 errors (a handful of intentionally-downgraded warnings
  from a new, very strict React Compiler–era lint rule flagging standard
  data-fetching effects; see the comment in `eslint.config.mjs`)
- End-to-end API smoke tests: login (incl. wrong password), full job status
  lifecycle NEW→CLOSED with invalid-transition rejection, estimate save/
  send/approve, payment recording with auto invoice sync, purchase order
  create→receive with live stock increments, stock adjustments, RBAC
  (a Technician is correctly blocked from `/settings`, `/customers`, etc.,
  both at the page and API level), and a confirmed fix for a `passwordHash`
  leak that was found and closed during testing (see `src/lib/prisma.ts`)
- Visual + responsive pass with a real headless browser at 375px and
  1440px across dashboard, jobs list/detail/new, customers, inventory,
  payments, reports, login and the public status page — the jobs/
  customers/inventory/payments/purchases list pages use a stacked card
  layout below `sm:` instead of a horizontally-scrolling table, since the
  raw table hid the columns that matter most (status, amount) off-screen
