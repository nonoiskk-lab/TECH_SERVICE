# API documentation

All routes are in `src/app/api/`. Bodies are JSON. Errors are `{ "error": "CODE" }`. Amounts are integer paise. Times are ISO 8601 UTC unless a field says IST. Rate-limited routes answer `429 RATE_LIMITED`.

## Public

| Route | Method | Purpose | Notes |
|---|---|---|---|
| `/api/public-config` | GET | Public, non-secret business facts and whether the Legal Gate is open (used by the CI consistency check) | The Razorpay key id is returned only in the `/api/checkout` response, never the secret |
| `/api/availability?date=YYYY-MM-DD&packageId=&duration=` | GET | Slots for a day with status `available`, `held`, `booked`, `blocked`, `past` | Computed on the server, never cached |
| `/api/calendar?month=YYYY-MM&packageId=&duration=` | GET | Day status for a month: `available`, `full`, `unavailable` | |
| `/api/holds` | POST `{packageId, start, durationMinutes}` | Creates a hold (15 min) | `409 SLOT_TAKEN`, `400 BAD_REQUEST` |
| `/api/holds/[id]` | DELETE | Releases a hold the browser owns | |
| `/api/holds/[id]/release` | POST | Same, for `sendBeacon` on page close | |
| `/api/otp` | POST `{action: send|verify, phone, code?}` | Phone OTP | Per-IP and per-phone limits; `503 OTP_UNAVAILABLE` when no provider |
| `/api/coupons` | POST `{code, packageId}` | Checks a coupon rule | 20 per 10 min per IP |
| `/api/checkout` | POST | Re-prices on the server, creates the booking and, online, a Razorpay order | 15 per 10 min per IP; declaration consent required (server-enforced) |
| `/api/checkout/confirm` | POST `{orderId, paymentId, signature}` | Browser callback after Razorpay Checkout; verifies the signature server-side | `402 PAYMENT_NOT_CONFIRMED`, `410 HOLD_EXPIRED` |
| `/api/leads` | POST | Enquiry form | |
| `/api/events` | POST | Anonymous event counter | |

## Webhook

`POST /api/webhooks/razorpay`: verifies `X-Razorpay-Signature` (HMAC-SHA256 over the raw body, `RAZORPAY_WEBHOOK_SECRET`), claims `X-Razorpay-Event-Id` (duplicates answer `200 ok (duplicate)`), then handles `payment.captured` (amount and currency checked against the order), `payment.failed`, `refund.processed`. `400` bad signature or payload, `503` secret not configured, `500` processing failed (claim released so Razorpay retries).

## Cron

`GET|POST /api/cron/run` with `Authorization: Bearer $CRON_SECRET` (401 otherwise; always 401 if `CRON_SECRET` is unset). Steps: (1) unpaid online bookings are nudged once, then released; (2) reminders; (3) feedback requests; (4) retry queued messages; (5) retention: recordings past their delete date, old holds and rate-limit rows; (6) plans past validity (remaining minutes written off in the ledger); (7) Razorpay payment reconciliation. Returns counts.

## Server actions (not HTTP APIs)

Admin, staff and customer mutations are Next.js server actions in `src/server/{admin,customer-actions,guest-actions,staff-actions,feedback-actions}*.ts`. Each checks the session and permission on the server (`requireRole` / `currentCustomer`) before doing anything.

## Authorisation summary

| Surface | Access |
|---|---|
| `/api/*` public routes above | Anyone, rate limited where it can be abused |
| `/my-booking/[id]` | Booking ID with private token, or ID + phone + email |
| `/account/*` | Signed-in customer; each query is scoped to that customer |
| `/staff/*` | Staff session with `checkin` permission |
| `/admin/*` and `/admin/export/*` | Staff session; each page and export checks its permission; anonymous export returns 403 |
