# Phase 1: Research

Date: 20 Nov 2026.

**Method:** each reference site was opened in a headless mobile browser (390 px), its visible text saved, and each claim below checked against that text. Lines marked *(earlier audit)* come from the 19 Nov competitor audit (`docs/COMPETITOR_AUDIT.md`). Nothing below is assumed: a feature that was not seen is listed as "not seen", not as "absent".

## Business sources

The prompt's **"THIRD SPACE Operations & Launch Plan" was not supplied** in this session. The business rules here come from what the owner did supply:

- **Launch package table:** Private Cinema ₹1,699, Premium ₹2,699, Podcast/Content ₹1,899, Birthday/Anniversary ₹2,499+, Family ₹6,999, Small Celebration ₹799, Creator Plan ₹4,999.
- **Terms v2.0 pack:** Master 18+ Safety & Conduct Policy plus the Theatre, Podcast and Creator addenda.
- **Mandatory Customer Declaration.**
- **Owner's chat decisions:**
  - 30 min setup and 30 min gap
  - time decided by movie length / work
  - ₹799 minimum
  - contact details
  - legal entity "THIRD SPACE"

Anything else is listed under assumptions in Phase 2.

## Studio references

| Site | Verified on the page | Notes |
|---|---|---|
| yanisastudios.com | Studio marketplace with "from ₹6,500/hr"-style hourly prices; FAQ "Do I get a GST invoice?" and cancel/reschedule; Refund Policy, Terms, Grievance pages; hours Monday–Saturday 10:00 | 15-minute hold, itemised checkout with GST + 2% fee, and Razorpay *(earlier audit)* |
| drbomb.com | "₹2,999 / hour · Standard Recording · GST included"; hour packs "valid … six calendar months"; WhatsApp; separate Cancellation and Refund pages | Format picker, instant vs quote *(earlier audit)* |
| mwsindia.in | Studio rental vs full production; WhatsApp; free consultation step; long service pages | No prices on the page; heading clipped on mobile *(earlier audit)* |
| primetalkstudios.com | Payment options "UPI · Credit Card · Debit Card · Netbanking · EMI · Pay Later"; "30-min slot … Non-refundable · Non-transferable · GST Included · GST Invoice Available"; journey "You Book → Confirmation Email in 60 seconds → Reminder Email → You Arrive"; "15-minute heads-up before your session ends" | Booking hands off to an external tool *(earlier audit)* |
| indiehabitat.com | **Could not verify:** the site answered with a bot check ("One moment, please…") | Footer error and "#" link *(earlier audit)* |

## Booking software references

| Product | Verified on the page |
|---|---|
| simplybook.me | Deposits and online payments; notifications and reminders via WhatsApp, SMS and email; packages, membership, coupons, gift cards, waiting list, POS |
| skedda.com | "Quotas, buffers, booking windows"; "Granular admin roles and permissions"; resource booking (desks, rooms, facilities) |
| zoho.com/bookings | Payments "via Stripe, PayPal, Razorpay"; WhatsApp integration (schedule / reschedule / cancel); automated reminders; one-on-one, group, collective and **resource-based** bookings; recurring bookings |
| acuityscheduling.com | "Reduced no-shows with deposits, appointment reminders, and cancelation policies"; packages, subscriptions, gift certificates, add-ons, coupons; availability controls |
| cal.com | "Buffers & limits", "Multiple durations", "Requires confirmation", "Date overrides", "Restriction schedules"; SMS reminders via workflows; insights with Completed / Rescheduled / Cancelled / No-Show |

## What the best ones do, and what THIRD SPACE adds

| Theme | Best seen | THIRD SPACE design |
|---|---|---|
| Price clarity | DrBomb (price + "GST included" on the card), PrimeTalk (GST invoice) | Starting price on every card and in the price list; itemised total with tax before paying |
| Short checkout | PrimeTalk ("Booked online in 2 minutes"), Cal.com | 6 guided steps on one page, no account, details remembered in the flow |
| Holds | Yanisa (15-min hold) *(earlier audit)* | 15-min hold with a visible countdown, released on expiry |
| Buffers and limits | Skedda, Cal.com | Per-resource buffer, opening hours, holidays, maintenance blocks, booking window |
| Resources | Zoho (resource-based), Skedda | Two independent resources (Theatre, Studio) plus shared staff/equipment conflict detection |
| Deposits / no-shows | Acuity, SimplyBook | Configurable advance %; tiered refunds; No-Show status |
| Payments in India | PrimeTalk (UPI, cards, netbanking), Zoho (Razorpay) | Razorpay Orders + Checkout; signature check and webhooks on the server |
| Notifications | SimplyBook, Zoho, Cal.com | WhatsApp Cloud API templates + email; 24 h and 2 h reminders; outbox fallback |
| Packages / memberships | DrBomb hour packs, Acuity, SimplyBook | Monthly Creator Plan with tracked remaining hours |
| Coupons / add-ons | Acuity, SimplyBook | Coupon codes and add-on catalogue, editable by admin |
| Insights | Cal.com (completed / cancelled / no-show) | Admin dashboard: revenue, utilisation, cancellations, CSV export |
| Unique to THIRD SPACE | none of the references | Theatre and studio in one engine, 18+ declaration with stored version, film-licence gate, secure recording delivery |

## Customer journeys mapped

1. **Podcast creator:** home → Podcast & Creator Studio → package → work-based time → date → slot → details → pay → confirmation → WhatsApp → files delivered → feedback.
2. **Couple or family:** home → Private Theatre (once licensed) → package and title → date → slot → add-ons → pay → reminders → check-in with 18+ ID.
3. **Celebration:** home → Celebrations → theme → add-ons / custom quote → date → slot → pay.
4. **Creator Plan:** Creator Monthly Plans → buy plan → first session → remaining hours shown in My Booking.
5. **Returning guest:** My Booking → find with booking ID + phone → view, receipt, cancel request, files.

## Requirements carried into Phase 2

Everything in sections 7–17 of the master prompt, plus the owner's earlier rules (30 min setup and 30 min gap, ₹799 minimum, Legal Gate, 18+ declaration).
