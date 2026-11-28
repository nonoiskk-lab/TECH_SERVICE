# Assumptions and decisions

Business information that was not supplied is handled with configurable defaults. Nothing below is a confirmed commercial policy unless it says **Owner-stated**. Detailed open questions: `docs/v4/MISSING-DECISIONS.md`.

## Owner-stated (Documented)

| Rule | Where it lives |
|---|---|
| Booked time = work time + 30 minutes setup, no rounding; 30-minute gap kept free after every booking | Slot engine, `sessionRules` |
| Lowest price of any booking ₹799 before add-ons and GST | Settings `minimumCharge` (admin editable) |
| Launch package prices (draft until re-approved): Private Cinema ₹1,699 / 2 h, Premium ₹2,699 / 2 h, Podcast and Content ₹1,899 / 2 h, Birthday and Anniversary ₹2,499+, Family ₹6,999 / 3 h, Small Private Celebration ₹799 / 1 h, Monthly Creator Plan ₹4,999 for 8 h | Package rows (admin editable) |
| 18+ venue, mandatory declaration, policy pack v2.0 | Policy pages, checkout enforcement |
| Film screenings hidden until licences are in place | Legal Gate |

## Assumptions (editable in admin unless noted)

| Assumption | Default | Editable |
|---|---|---|
| GST | 18% on base plus add-ons, exclusive | Settings |
| Advance paid online | 50% | Settings, per package |
| Refund tiers on the advance | 72 h or more: 90%; 24 h or more: 50%; less: 0% | Settings |
| Checkout hold | 15 minutes | Settings |
| Opening hours | 10:00 to 22:00 daily | Resource settings |
| Guest self-reschedule | Once, 24 hours or more before, same package and length | Settings |
| Credits restored on cancellation | Staff cancel: yes (once); guest cancel: only 24 hours or more before start | Code (not yet a setting) |
| Plan validity | 30 days from the first session unless the package says otherwise | Package |
| Recording retention | Link expiry and delete-after days per recording | Per recording |
| Business timezone | Asia/Kolkata, fixed +05:30 | Code |

## Technical decisions

| Decision | Reason | Revisit |
|---|---|---|
| Modular monolith on Next.js 16 | Locked by owner; one deployable, simple operations | No |
| Postgres exclusion constraint plus advisory locks | Defence in depth against double booking | No |
| Money in integer paise | Exact GST and refunds, matches Razorpay | No |
| Append-only credit ledger with DB trigger | Auditable, no negative balance, no double deduction | No |
| Confirmation only by verified signature, verified webhook or reconciliation | Never trust the frontend | No |
| Preview builds do not migrate | They share the production DB | After a staging DB exists |
| Staff portal reuses the admin session and roles | One login system, fewer moving parts | If a separate staff identity is needed |
| Provider adapters (Razorpay, WhatsApp, Resend) with an outbox | Build and test now, connect when accounts exist | When keys exist |
| English plus Hinglish copy | Owner request | Hindi script is not provided |
| Design: light v5 system using THIRD SPACE tokens (see `docs/DESIGN_SYSTEM.md`) | Owner asked for a Perfect Venue style structure; no Perfect Venue assets are used | Decision MD-01 (Skedda Reports 11 and 12 are missing) |

## Plan hours for staff bookings

A session booked by staff with a guest's Creator Plan hours is recorded with total ₹0 (the plan was paid for when bought), and the booked minutes (including setup) leave the ledger in the same transaction. Revenue reports therefore count the plan once, at purchase. The mobile number must match the plan holder.

## Deliberately not done

- `timestamptz` columns and foreign keys for `Booking.resource` / `packageId`: touching every booking query; worth a dedicated migration with a staging database.
- Eight-role model: needs the owner's role mapping (MD-06).
- Invoices and GST invoice numbering: needs GSTIN and invoice format (MD-08).
- Guests redeeming plan hours themselves online (staff can do it today).
- A "cancellation request" workflow (cancellation is immediate for eligible bookings).
