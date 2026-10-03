# RepairFlow — Laptop & Computer Service Center OS

RepairFlow connects customer intake, device diagnosis, estimates, repair
tracking, inventory/procurement, payments and WhatsApp customer updates into
one system for a laptop & computer service center — so a laptop's whole
journey from drop-off to delivery lives in one place instead of a notebook,
a WhatsApp thread and someone's memory.

## Stack

- **Next.js 16** (App Router) + **TypeScript**, Tailwind CSS v4
- **Prisma** ORM on **PostgreSQL** (a free Supabase project in the live demo;
  any Postgres instance works locally — see [Database](#database))
- Cookie-based session auth (JWT via `jose`, bcrypt password hashing) with
  four roles: Admin, Service Manager, Technician, Front Desk
- WhatsApp via free `wa.me` deep links by default, with an optional Twilio
  WhatsApp API integration for fully automatic sending
- `recharts` for the dashboard revenue chart, `qrcode` for the invoice/status
  QR code, `sonner` for toasts, `lucide-react` for icons

## Getting started

```bash
npm install
# Point DATABASE_URL (in .env) at a Postgres database you control, then:
npx prisma migrate dev   # applies the schema
npm run db:seed          # realistic demo data across every module
npm run dev
```

Open http://localhost:3000 — you'll land on the login page.

## Database

The schema (`prisma/schema.prisma`) targets Postgres. The live deployment
uses a small, dedicated Supabase project created for this preview; for your
own environment, point `DATABASE_URL` at any Postgres instance (Supabase,
RDS, a local `postgres` container, etc.) and run `npx prisma migrate dev`.
No table uses a Postgres-only feature beyond what every managed Postgres
offers, so nothing else needs to change.

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
| `DATABASE_URL` | Postgres connection string |
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
  checklist & accessories → complaint), a simple 4-status pipeline
  (Received → Repair In Progress → Delivered → Completed) with validated
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
- **Live demo credentials committed**: `.env.production` in this repo holds
  the connection string for the dedicated demo Supabase project and a demo
  `AUTH_SECRET`, committed only because the deployment tooling available in
  this session had no way to set Vercel environment variables directly.
  Rotate both (or delete the file and set real env vars in the Vercel
  dashboard instead) before this goes anywhere near real customer data.

## Production readiness checklist

- [ ] Replace `DATABASE_URL` and `AUTH_SECRET` with your own values set as
      real environment variables (Vercel dashboard, etc.) rather than the
      committed `.env.production` demo values; delete that file once done
- [ ] Remove or disable the demo accounts seeded above
- [ ] Move to your own Postgres project (a new Supabase project, RDS, etc.)
      rather than the shared demo one
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
