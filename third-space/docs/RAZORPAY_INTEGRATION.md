# Razorpay integration

Status: **Implemented and tested against a controllable fake gateway and a mock mode. Not verified against Razorpay. No Razorpay keys exist in any environment, so nothing is Production-configured or Live.** The live site runs in pay-at-venue mode (`paymentMode()` returns `venue` in production without keys).

Code: `src/server/payments.ts` (adapters), `src/server/slots/engine.ts` (`confirmPayment`), `src/app/api/{checkout,checkout/confirm,webhooks/razorpay}`, `src/server/refunds.ts`, `src/server/reconcile.ts`.

## Flow

1. **Order.** `/api/checkout` re-prices on the server (paise), creates a `pending_payment` booking and a `Payment` row (`created`), then `POST /v1/orders` with the amount in paise, INR, receipt. The browser gets the order id and the public key id only.
2. **Checkout.** Razorpay Checkout runs in the browser (script from `checkout.razorpay.com`, allowed by the CSP).
3. **Confirmation, any of three paths, all idempotent:**
   - browser callback: `HMAC-SHA256(order_id|payment_id, key_secret)` compared in constant time;
   - webhook `payment.captured`: signature over the raw body, event id claimed once, **amount and currency compared with the order**;
   - reconciliation job: lists the order's payments from Razorpay and confirms an exact-amount capture.
   Frontend success alone never confirms a booking.
4. **Failure.** `payment.failed` marks the payment `failed`; the booking stays `pending_payment` until its hold expires. A failed payment never becomes a confirmed booking.
5. **Refunds.** Cancellation sets `refund_pending` with the refund amount (tiers or manual). Admin presses "Refund via Razorpay": `POST /v1/payments/{id}/refund` with the amount in paise and `X-Refund-Idempotency: refund-<bookingId>`. The `Payment` row is keyed by the refund id; the booking becomes `refunded` when the gateway reports processed (immediately, or through `refund.processed`). A failed gateway call changes nothing and can be retried. "Mark refund paid" remains for refunds made outside the gateway.

## Safety properties (tested in `tests/payments.test.ts`)

- Wrong amount or currency: not confirmed, audit entry written.
- Ten simultaneous confirmations: one fresh result, advance added once, balance 0. (This test exposed a real race, now fixed with a row lock.)
- Reconciliation recovers a missed webhook, ignores young orders, never confirms an amount mismatch, marks all-failed orders failed.
- Refund: exact paise, requested once, retry-safe, never above the captured amount, only from `refund_pending`.
- Webhook: signature, duplicate event, processing failure releases the claim (e2e covers signature and duplicate).

## Configuration

| Variable | Use |
|---|---|
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Orders, refunds, order listing. Server only. |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature. Without it the webhook answers 503. |
| `PAYMENTS_MODE` | `razorpay`, `mock` (tests only), `venue`. Production without keys is `venue`; mock refunds are refused in production. |

Use **test-mode keys** first; never put live keys in development or CI.

## What is not done

- No call has been made to the real Razorpay API (no keys). Field names and endpoints follow the public API documentation and must be verified in test mode.
- Reconciliation runs from the daily cron only. Razorpay's retries cover most missed webhooks; for a tighter safety net run `/api/cron/run` every 15 minutes from an external scheduler or a paid Vercel plan.
- Payment-failure and abandoned-checkout UX is covered by hold expiry, not by a "retry payment" screen.
- Partial refund UI beyond the amount field at cancellation; no refund for balance paid at the venue (that is cash or UPI handled outside the app).
