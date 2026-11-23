# Booking engine

Code: `src/server/slots/engine.ts` (availability, holds, booking creation, payment confirmation), `src/server/reschedule.ts`, `src/server/booking-state.ts`, `src/server/credits.ts`.

## Calendars and resources

Two bookable spaces, each with its own `Resource` row (opening and closing time, slot step, buffer, booking window in days): the Private Theatre (`room`) and the Studio (`studio`). Availability is computed per resource, so the two calendars are independent. Packages belong to one resource. Shared staff or equipment can be linked to packages through `SharedAsset` / `PackageAsset`; a booking of any linked package blocks the others for that time (checked under the advisory lock `ts:assets`).

Closures are `SlotBlock` rows (admin "Block time"). Hours and buffers are editable in admin Settings and Packages.

## Rules implemented

| Rule | Where |
|---|---|
| The server never trusts the client's availability. `/api/availability` and `/api/calendar` are computed from the database on every request (no caching). | `availability`, `monthAvailability` |
| A slot must be on the grid, inside opening hours, within the booking window and after launch. | `holds.create` |
| Time and price are recomputed on the server from what the guest chose (title runtime, episodes, reels, hours) plus 30 minutes setup. A hold whose length no longer matches is rejected. | `src/lib/session.ts`, `createBooking` |
| Temporary hold: 15 minutes by default (`holdMinutes` setting). A hold blocks the slot for everyone while the guest completes details. | `holds.create`, `Hold.expiresAt` |
| Abandoned holds expire by time (expired rows are ignored by every availability query) and are deleted by the daily cron and lazily. | `busyIntervals`, `api/cron/run` |
| Buffer: a gap after every booking (30 minutes default, owner-stated rule) is kept free. | `statusAt` |
| Two concurrent attempts for one slot: all writes take `pg_advisory_xact_lock(hashtext('ts:<resource>'))`, so one succeeds and the other gets `SLOT_TAKEN`. | `lock` |
| Database last line of defence: a booking cannot become live (confirmed, checked in, in progress, completed) if it overlaps another live booking on the same resource. | `booking_no_overlap` |
| Coupon use is counted atomically in the booking transaction. | `createBooking` |
| Customer, booking, policy acceptance and audit entry are created in one transaction. | `createBooking` |
| Online payment: booking starts `pending_payment` and is covered by its hold. Only a verified signature, a verified webhook or reconciliation can make it `confirmed`. | `confirmPayment` |
| A late payment (hold expired) confirms only if the time is still free; otherwise the booking becomes `refund_pending`. | `confirmPayment` |
| Confirmation is serialised per payment with a row lock, so a webhook and the browser callback arriving together add the advance once. | `confirmPayment` |

## Booking status

```
pending_payment → confirmed → checked_in → in_progress → completed
                      ↘ no_show (only after start)         ↘ stopped (incident)
confirmed / pending_payment → cancelled → refund_pending → refunded
late capture → refund_pending
```

Operational transitions (check-in onward) are guarded by `canOpsTransition` in both the admin and the staff portal. Payment status lives separately on `Payment.status` (`created`, `captured`, `failed`, `pending`, `refunded`).

## Reschedule and cancel

- Guest self-reschedule (rules editable in Settings: allowed or not, minimum hours before, maximum times) and admin reschedule use the same slot engine (`src/server/reschedule.ts`), so conflicts are checked identically.
- Guest cancel applies the refund tiers (editable in Settings) to the advance paid online; staff cancel sets the refund amount manually with a written reason. Both write audit entries and, for a plan booking, give back consumed credits (guest: 24 hours or more before start; ASSUMPTION).

## Admin overrides

Admin can create a booking for a guest, move it, cancel it with a custom refund, block time and manually confirm payments made outside Razorpay. All go through the same engine and each writes `AuditLog` with the staff name.

## Credits

Plan hours are an append-only ledger (`CreditEntry`). Purchase and first session are posted when the plan booking is confirmed; staff record usage and adjustments (reason required); cron expires remaining minutes at validity end; cancellation restores consumed minutes once. *Not built:* paying for a normal booking with credits online.

## Tests

`tests/booking-overlap.test.ts`, `tests/payments.test.ts`, `tests/credit-ledger.test.ts`, `tests/booking-state.test.ts`, and e2e `booking.spec.ts`, `session.spec.ts`, `master.spec.ts`, `staff.spec.ts` (two guests on one slot, hold expiry, 30-minute gap, server pricing, webhook idempotency, reschedule).

## Known limits

- The two-guest race is tested through the API and the database constraint; there is no browser-level load test.
- Overlap protection by constraint covers the booked resource, not shared staff or equipment.
- Hold expiry and payment expiry cleanup run from the daily cron; the free Vercel plan only allows a daily schedule (see DEPLOYMENT_GUIDE).
