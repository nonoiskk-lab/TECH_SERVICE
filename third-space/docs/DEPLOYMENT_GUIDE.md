# Deployment guide

## Current deployment (verified 2026-11-23)

| Item | Value |
|---|---|
| Host | Vercel project `third-space` (team `nonoiskk-labs-projects`), region `bom1` |
| URL | https://third-space-gamma.vercel.app (production alias); no custom domain yet |
| Source | GitHub `nonoiskk-lab/TECH_SERVICE`, branch `claude/intelligent-ride-aojomq`, root directory `third-space` (PR #11 is open; production currently serves this branch) |
| Database | Supabase project `third-space` (ap-south-1, Postgres 17), schema `thirdspace`; Session pooler URL with `?schema=thirdspace&connection_limit=1` |
| Build | `vercel-build` → `node scripts/vercel-build.mjs`: **production builds run `prisma migrate deploy`; preview builds skip it** |
| Production deployment | `dpl_451rksecGiqqc12DNfJg4UnQMdgB`, commit `c25eace`, state READY |
| Deployment protection | Previews are behind Vercel Authentication; production is public |

## Environment variables

| Name | Production now | Notes |
|---|---|---|
| `DATABASE_URL` | set | Also set for Preview (previews read production data until a staging DB exists) |
| `AUTH_SECRET` | set | 16+ characters; signs staff and customer cookies |
| `ADMIN_PASSWORD` | set | Bootstrap owner login; restrict or remove (MD-17) |
| `SITE_URL` | set | Used in links and sitemap |
| `THIRD_SPACE_LEGAL_GATE` | `closed` | Open only with film licences |
| `POLICY_STATUS` | `draft` | Until advocate approval |
| `CRON_SECRET` | **not set** | Required for `/api/cron/run`; Vercel Cron sends it as `Authorization: Bearer` automatically |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | **not set** | Site runs pay-at-venue |
| `RESEND_API_KEY`, `EMAIL_FROM` | not set | Email delivery |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_LANG` | not set | WhatsApp delivery |
| `OTP_MODE` | not set (production default `off`) | `sms` needs a provider that is not wired |
| `PAYMENTS_MODE` | not set | Never `mock` in production |

Secrets are set in Vercel (Settings → Environment Variables) or by the owner; never in chat, commits or documents.

## Releasing

1. Merge or push to the production branch with CI green (`.github/workflows/third-space.yml`: typecheck, lint, migrate, unit tests, build, content checks, e2e).
2. Create a production deployment. The build applies new migrations first, then builds.
3. **Migrations are applied while the previous deployment is still serving.** Prefer additive migrations. The one destructive-looking migration so far (paise) multiplies stored amounts by 100 and therefore briefly mismatched old code and new data during the 2026-11-23 release; there were no bookings then. For any future non-additive migration, plan a maintenance window or an expand-contract sequence.
4. Verify (RELEASE_CHECKLIST, "after deploy").

## Rollback

- **Code:** Vercel → Deployments → promote the previous READY production deployment (`isRollbackCandidate`). Rolling back code after the paise migration without rolling back data shows prices 100 times too high; do not do that alone.
- **Data, paise migration:** every money column ÷ 100 (`UPDATE "Booking" SET "subtotal" = "subtotal"/100, …` for each column in `20261123130000_money_in_paise`, flat coupon values only, and `Setting.business.minimumCharge`). Only valid while no amount with paise precision (GST) was stored; verify first.
- **Data, other migrations:** additive. `DROP TRIGGER`/`DROP TABLE "CreditEntry"` etc. is safe only if the new code is also rolled back. Take a backup first.

## Health checks

- `GET /api/public-config` returns 200 with business facts (cheap liveness check, bypasses no auth).
- `GET /api/availability?date=…&packageId=podcast&duration=120` exercises the database.
- `GET /admin/login` returns 200; `/staff` redirects to it when signed out.
- Vercel → Logs / Runtime errors; `get_runtime_errors` returned none after the 2026-11-23 release.

## Backups and monitoring (not done)

Unknown whether the Supabase plan includes daily backups or point-in-time recovery; no restore has been tested; no error reporting or uptime alert is configured. Required before real payments: confirm plan, run one restore into a scratch project and record the time, add an uptime monitor on the two health URLs and error reporting.

## Razorpay go-live steps (owner)

1. Create the Razorpay account; complete KYC.
2. In test mode create keys; add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` in Vercel (Preview first if a staging DB exists).
3. Add webhook `https://<domain>/api/webhooks/razorpay` for `payment.captured`, `payment.failed`, `refund.processed`; copy its secret to `RAZORPAY_WEBHOOK_SECRET`.
4. Redeploy; run RELEASE_CHECKLIST "Razorpay test mode".
5. Switch to live keys only after the test-mode checklist passes; redeploy.

## Domain

Add the domain in Vercel → Domains, set DNS as shown, update `SITE_URL`, redeploy. HTTPS is automatic. HSTS is already sent.
