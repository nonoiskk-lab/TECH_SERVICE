# Test report — 2026-11-20

Build: `next build` OK · `tsc --noEmit` OK · `eslint` OK.

**Playwright e2e (390 px mobile): 51 passed, 14 skipped by design** (admin/payment flows run once on the gate-closed server). Three servers: gate closed, gate open, live mode (pay at venue, no OTP).

Covered:
- Booking happy path, hold expiry, slot taken, free visit, declaration required server-side, celebration with add-ons.
- Automatic time and price (episodes / reels / movie runtime), ₹799 minimum, 30-min gap after every booking, mismatched hold rejected.
- Legal Gate closed/open behaviour, theatre with licensed title.
- Admin: login required, check-in, incident on stop, blocked time removes slots, notifications queued.
- **New:** all new pages answer 200; `/watch`, `/create`, `/celebrate` 308-redirect; PWA manifest; home tagline, endorsement, map, FAQs, popular packages; month calendar API statuses; Razorpay webhook (bad signature refused, payment.captured confirms the pending booking, duplicate event ignored); My Booking lookup (wrong email refused, correct details open the receipt); guest cancellation with refund state; admin-created coupon validates via API; CSV export needs login (403) and works for Super Admin; Staff role is denied Payments page and payments CSV (403).
- Policies v2.0, Hinglish toggle, enquiry lead, WhatsApp link, no horizontal scroll and 44 px tap targets.

**Content checker** (`scripts/check-content.mjs`): 27 pages, gate closed — no placeholders, dead links, unverifiable claims, inconsistent contact data or screening wording.

Not tested automatically: real Razorpay checkout popup, real WhatsApp / email delivery, SMS OTP (need live credentials).
