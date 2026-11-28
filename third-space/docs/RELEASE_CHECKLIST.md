# Release checklist

Legend: ☑ done and evidenced · ☐ not done (owner or external) · ◐ partly.

## A. Engineering (done in this release)

- ☑ Typecheck, lint, production build pass; CI green on pushes through #47 at the time of writing (see PROJECT_STATUS for the latest).
- ☑ 36 unit/database tests, 74 e2e tests, 11 accessibility checks, 34 content checks pass.
- ☑ Double booking prevented in the engine and in the database (50 parallel inserts → 1).
- ☑ Payment confirmation idempotent under parallel delivery; amount and currency verified; webhook signature and event de-duplication.
- ☑ Refund API call, reconciliation job implemented and tested against a fake gateway.
- ☑ Credit ledger append-only with DB-enforced non-negative balance.
- ☑ Customer accounts, password reset, session revocation; staff portal; admin dashboard on real data.
- ☑ Security headers (HSTS, CSP, COOP); rate limits on login, OTP, checkout, coupons, lookup, reset.
- ☑ Production deployed and verified (prices, availability, headers, no runtime errors). See TESTING_REPORT.

## B. Before taking real payments (blocking)

- ☐ Razorpay account, KYC, **test-mode** keys and webhook secret in Vercel.
- ☐ Razorpay test-mode run: (1) successful payment confirms once; (2) failed payment leaves `pending_payment`; (3) abandoned checkout expires; (4) closing the tab after paying is recovered by the webhook; (5) the same webhook delivered twice; (6) full and partial refund via "Refund via Razorpay" reaches `refunded`; (7) reconciliation recovers a payment whose webhook was blocked. Record results in TESTING_REPORT.
- ☐ `CRON_SECRET` set; cron scheduled at least every 15 minutes (paid Vercel plan or external scheduler).
- ☐ Backup plan confirmed on Supabase and one restore drill timed (O4).
- ☐ Staging database; previews pointed at it (O3).
- ☐ Decide `ADMIN_PASSWORD` fate (O2) and create named staff accounts.
- ☐ Owner approves: prices (MD-02), GST (MD-03), advance (MD-04), refund tiers (MD-05), hours and hold (MD-09).
- ☐ Policy pack approved by the advocate; `POLICY_STATUS` set accordingly.
- ☐ Error monitoring and uptime alerts on the health URLs.

## C. Before public launch

- ☐ Custom domain, `SITE_URL`, DNS, redeploy.
- ☐ Real venue photography replaces illustrations; owner approves the design (MD-01).
- ☐ Email provider (Resend key, verified sender) and, if wanted, WhatsApp Business templates; send test messages and record delivery. Do not announce either channel before this is done.
- ☐ GSTIN and invoice details (MD-08) if invoices are required.
- ☐ Film licences before setting `THIRD_SPACE_LEGAL_GATE=open`.
- ☐ Manual keyboard and screen-reader pass; test on a real phone and on Safari.
- ☐ Prisma 7 upgrade (O1) scheduled.

## D. After every deploy

1. Deployment state READY; open `/api/public-config` (200) and `/api/availability?…` (slots).
2. Check `/pricing` shows the approved prices.
3. Open `/admin/login`, sign in, load the dashboard.
4. Vercel runtime errors for the last hour: none.
5. Place a test booking (pay at venue) for a far-future date, then cancel it in admin; confirm the slot reopens.

## E. Rollback

See DEPLOYMENT_GUIDE "Rollback". Never roll code back across the paise migration without its data step.
