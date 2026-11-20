# Going live (Vercel + Supabase)

The code is ready; going live needs one database and one Vercel project. Everything below is a one-time setup.

## 1. Database (Supabase, free plan)

1. In Supabase, open the organization "New One" → New project.
   - Name `third-space`.
   - Region **Mumbai (ap-south-1)**.
   - Choose a strong database password and keep it.
2. Project → Connect → **Session pooler** connection string (IPv4; works from Vercel). It looks like:
   `postgresql://postgres.<project-ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`
3. Add `?schema=thirdspace&connection_limit=1` to the end. The tables then live in their own `thirdspace` schema, which Supabase's public REST API does not expose, so guest data cannot be read with the anon key.

## 2. Vercel project

1. Vercel → Add New → Project → import `nonoiskk-lab/TECH_SERVICE`.
   - Branch: `claude/intelligent-ride-aojomq`, until the PR is merged.
   - **Root Directory: `third-space`**.
   - Framework: Next.js.
2. Environment variables (Production):

| Name | Value |
|---|---|
| `DATABASE_URL` | the connection string from step 1.3 |
| `ADMIN_PASSWORD` | a strong staff password |
| `AUTH_SECRET` | a random string of 32+ characters |
| `SITE_URL` | the site's address, e.g. `https://third-space.vercel.app` or your domain |
| `THIRD_SPACE_LEGAL_GATE` | `closed` (set `open` only once film licences are in place) |

Leave these empty for now:
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: the site runs in **pay-at-venue** mode, with no online payment.
- `OTP_MODE`: the OTP step stays off.
- `PAYMENTS_MODE`: never set it to `mock` on the live site.

3. Deploy. The build runs `prisma migrate deploy` (the `vercel-build` script), which creates all tables before `next build`.

## 3. After the first deploy

- Open `/admin/login` with your name and `ADMIN_PASSWORD`. The **Go-live readiness** box lists what is still missing.
- Add licensed titles under **Titles** before opening the Legal Gate.
- Later:
  - Razorpay keys turn on the online advance.
  - An SMS provider plus `OTP_MODE=sms` turns on OTP.
  - Add the domain in Vercel → Domains.

## 4. Integrations (master prompt) — add when ready

| Variable | Turns on | Where to get it |
|---|---|---|
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Online advance / full payment (Razorpay Checkout) | Razorpay Dashboard → API Keys |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook confirmation `/api/webhooks/razorpay` (events: payment.captured, payment.failed, refund.processed) | Razorpay Dashboard → Webhooks |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_<KIND>`, `WHATSAPP_TEMPLATE_LANG` | WhatsApp Cloud API messages (confirmation, reminders, cancellation, feedback) | Meta Business → WhatsApp → API setup; templates must be approved by Meta |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email copies of booking messages | resend.com, with a verified sending domain |
| `CRON_SECRET` | `/api/cron/run` (reminders, expiry of unpaid bookings, feedback, retention). Vercel Hobby runs it daily; for 24 h / 2 h reminders, call it every 15 min from an external cron with `Authorization: Bearer <CRON_SECRET>` | any random 32+ char string |
| `OTP_MODE=sms` + SMS provider | Phone OTP | MSG91 / Gupshup account (provider code not wired yet) |
| `THIRD_SPACE_MAP_URL` | Exact Google Maps pin | Google Maps → Share |

Old URLs `/watch`, `/create`, `/celebrate` permanently redirect to `/private-theatre`, `/podcast-studio`, `/celebrations`.
