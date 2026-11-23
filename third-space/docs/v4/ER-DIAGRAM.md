# Entity-relationship diagram

**Date:** 2026-11-23. **Phase:** 0.
- §1 is **Verified** from `prisma/schema.prisma` (30 models, schema `thirdspace`).
- §3 is **Proposed** and needs approval (MD-14, MD-15).

## 1. Current model (Verified)

Only foreign-key relations are drawn. `Booking.packageId`, `Booking.resource`, `Booking.titleId` and `Hold.resource` are **plain strings without foreign keys**. This is a gap noted in §2.

```mermaid
erDiagram
  Customer ||--o{ Booking : places
  Customer ||--o{ CreatorMembership : holds
  CreatorMembership ||--o{ MembershipUsage : consumes
  Booking ||--o{ MembershipUsage : "paid by"
  Booking ||--o{ Payment : has
  Booking ||--o| PolicyAcceptance : "accepted with"
  Booking ||--o{ Incident : "linked to"
  Booking ||--o{ Notification : triggers
  Booking ||--o{ RecordingFile : delivers
  Booking ||--o| Feedback : receives
  Package ||--o{ PackageAsset : uses
  SharedAsset ||--o{ PackageAsset : "shared by"

  Booking {
    string id PK
    string customerId FK
    string packageId "no FK"
    string resource "no FK"
    datetime start "timestamp(3) UTC"
    datetime end
    int subtotal "rupees"
    int tax "rupees"
    int total "rupees"
    int advancePaid "rupees"
    int balanceDue "rupees"
    string status
    string accessToken
  }
  Payment {
    string id PK
    string bookingId FK
    string kind
    string orderId
    string paymentId
    string refundId
    int amount "rupees"
    string status
  }
  Hold {
    string id PK
    string packageId
    string resource
    datetime start
    datetime end
    datetime expiresAt
  }
  Resource {
    string id PK
    string openTime
    string closeTime
    int slotStepMinutes
    int bufferMinutes
    int bookingWindowDays
  }
  CreatorMembership {
    string id PK
    string customerId FK
    int hoursTotal
    int minutesUsed
    string status
  }
```

**Models without relations** (stand-alone tables): `Hold`, `SlotBlock`, `PendingOrder`, `Lead`, `OtpCode`, `AuditLog`, `EventCount`, `Title`, `Resource`, `Package`, `AddOn`, `Coupon`, `Setting`, `WebhookEvent`, `Testimonial`, `GalleryImage`, `StaffUser`, `RateLimit`.

## 2. Integrity gaps in the current model (Verified)

| Gap | Effect |
|---|---|
| `Booking.resource`, `Hold.resource` are strings, not FKs to `Resource` | A typo or a renamed resource is not rejected by the database |
| `Booking.packageId` has no FK | Deleting a package leaves orphan references (the name is copied into `packageName`, so history survives) |
| `Booking.addOnIds` is a string array | Add-on prices are not snapshotted per line |
| No overlap constraint | Only the application lock prevents double-booking (R4) |
| Money in rupees | Not paise-exact (R3) |
| `CreatorMembership.minutesUsed` has no CHECK `≤ hoursTotal*60` | Over-consumption possible under a race |

## 3. Proposed additions (Proposed)

```mermaid
erDiagram
  Booking ||--o{ BookingResource : occupies
  Resource ||--o{ BookingResource : "booked as"
  ResourceType ||--o{ Resource : classifies
  Booking ||--o{ BookingLine : "priced by"
  Booking ||--o{ LedgerEntry : "accounted in"
  Payment ||--o{ LedgerEntry : posts
  Refund ||--o{ LedgerEntry : posts
  Payment ||--o{ Refund : "refunded by"
  Booking ||--o| Invoice : "billed by"
  Customer ||--o| CreditWallet : owns
  CreditWallet ||--o{ CreditEntry : records
  Booking ||--o{ ChecklistRun : "prepared by"
  ChecklistTemplate ||--o{ ChecklistRun : instantiates
  StaffUser ||--o{ ChecklistRun : completes
  Role ||--o{ RolePermission : grants
  StaffUser }o--|| Role : has

  BookingResource {
    string bookingId FK
    string resourceId FK
    tstzrange during "EXCLUDE USING gist where live"
    boolean live
  }
  BookingLine {
    string bookingId FK
    string kind "package addon discount tax"
    bigint amountPaise
  }
  LedgerEntry {
    string journalId
    string account
    bigint debitPaise
    bigint creditPaise
    timestamptz createdAt
  }
  Refund {
    string paymentId FK
    bigint amountPaise
    string razorpayRefundId
    string status
  }
  Invoice {
    string number "gap-free per FY"
    string bookingId FK
    bigint totalPaise
  }
  CreditEntry {
    string walletId FK
    string kind "purchase consume restore adjust expire"
    int minutes
  }
```

**Resource types (Proposed):** theatre room, studio, camera, microphone kit, lighting kit, operator (staff). Every exclusive resource gets rows in `BookingResource`; a booking succeeds only if every required resource is free.
