# Database schema

PostgreSQL 17 on Supabase (Mumbai, project `third-space`), Prisma 6, schema `thirdspace`. 32 models, 10 migrations in `prisma/migrations/`. Row-level security is enabled on every table; the schema is not exposed through Supabase's REST API.

## Models

| Group | Models |
|---|---|
| Booking | `Booking`, `Hold`, `SlotBlock`, `PendingOrder`, `PolicyAcceptance`, `Feedback` |
| Catalogue | `Resource`, `Package`, `AddOn`, `Coupon`, `SharedAsset`, `PackageAsset`, `Title`, `Setting` |
| Customers | `Customer`, `PasswordReset`, `CreatorMembership`, `MembershipUsage` (legacy log), `CreditEntry` (ledger) |
| Payments | `Payment`, `WebhookEvent` |
| Operations | `StaffUser`, `Incident`, `RecordingFile`, `AuditLog`, `Notification`, `Lead`, `Testimonial`, `GalleryImage` |
| Platform | `OtpCode`, `RateLimit`, `EventCount` |

## Conventions

- **Money:** every amount column is an integer number of **paise** (`Booking.subtotal/discount/tax/total/advancePaid/balanceDue/refundAmount`, `Payment.amount`, `PendingOrder.amount`, `Package.startingPrice/ratePerHour`, `AddOn.price`, flat `Coupon.value`, `Coupon.minSubtotal`, and `Setting.business.minimumCharge`). Percentages are plain integers.
- **Time:** `timestamp(3)` holding UTC.
- **Status columns** are strings (`Booking.status`, `Payment.status`, ...). Allowed ops transitions are enforced in `src/server/booking-state.ts`; other transitions are enforced by their services.

## Integrity enforced by the database

| Rule | Mechanism | Test |
|---|---|---|
| Two live bookings on one resource never overlap | `booking_no_overlap`: `EXCLUDE USING gist (resource WITH =, tsrange(start, end) WITH &&) WHERE status IN (confirmed, checked_in, in_progress, completed)` (extension `btree_gist`) | `tests/booking-overlap.test.ts`, 50 parallel inserts → 1 wins |
| Credit balance never negative | `BEFORE INSERT` trigger `credit_entry_balance_guard` takes a per-membership advisory lock, sums the ledger, raises `insufficient_credits` | `tests/credit-ledger.test.ts`, 20 parallel consumes of 60 min against 480 → exactly 8 |
| Credit ledger is append-only | `BEFORE UPDATE OR DELETE` trigger raises | same file |
| Ledger entry has the right sign for its kind, non-zero minutes | `CHECK` constraints | same file |
| Idempotent postings | `CreditEntry.key` unique | same file |
| Webhook event processed once | `WebhookEvent.id` primary key (claimed first, released on failure) | `e2e/master.spec.ts`, `tests/payments.test.ts` |
| One refund per gateway refund id | `Payment.refundId` unique | `tests/payments.test.ts` |
| Reset links single use | `PasswordReset.tokenHash` unique + conditional update | `e2e/account-reset.spec.ts` |

## Relations worth knowing

`Customer 1—n Booking`, `Booking 1—n Payment`, `Booking 1—1 PolicyAcceptance`, `Booking 1—1 Feedback`, `Booking n—1 StaffUser` (assigned staff, nullable), `CreatorMembership 1—n CreditEntry`, `Customer 1—n PasswordReset`, `Package n—n SharedAsset`.

## Known weaknesses (not fixed)

- `Booking.resource`, `Booking.packageId`, `Hold.resource` are strings without foreign keys.
- `Booking.addOnIds` is a string array; add-on prices are not snapshotted per line.
- Timestamps are not `timestamptz`.
- Overlap protection covers the booked resource only. Shared-asset (staff, equipment) conflicts are checked by the engine under an advisory lock, not by a constraint.
- `MembershipUsage` and `CreatorMembership.minutesUsed` are deprecated and no longer written; balances come from `CreditEntry`.

## Migrations

| Migration | Change |
|---|---|
| `20261119093544_init`, `20261119101301_dynamic_sessions`, `20261120095124_master_catalog` | Base tables; catalogue seeded in rupees |
| `20261120140000_customer_accounts`, `20261120170000_feedback` | Accounts, feedback |
| `20261123120000_booking_overlap_guard` | Exclusion constraint |
| `20261123130000_money_in_paise` | **One-way**: multiplies stored amounts by 100. Rollback = divide by 100 (see DEPLOYMENT_GUIDE) |
| `20261123140000_credit_ledger` | Ledger, triggers, backfill from old balances |
| `20261123150000_password_reset` | `PasswordReset`, `Customer.sessionsValidFrom` |
| `20261123160000_staff_ops` | Assignment, room ready, staff notes |
