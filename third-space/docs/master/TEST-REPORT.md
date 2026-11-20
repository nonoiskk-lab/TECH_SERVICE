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

## Update — design-system audit release (2026-11-20, later)

Build OK · `tsc` OK · `eslint` OK. **Playwright: 57 passed, 0 failed, 16 skipped by design.**

New tests:
- Customer account: signup with a phone that has bookings is refused under a different email; with the matching email it claims the history; the dashboard lists the booking.
- Self-service reschedule from the account → My Booking: pick a date, choose a live free slot, booking moves, "moved" notice, card disappears after the allowed one move.
- Logout; login with wrong password refused; login with mobile number works; booking form is prefilled for a signed-in guest.
- `/account` requires login.
- `/pricing` comparison table lists every bookable package from the catalogue (theatre rows only when the gate is open) and the ₹799 minimum note.
- `/creative-studio` shows a working booking flow and the custom-package enquiry form.

Content checker: 34 pages, gate closed, all passed (it now follows same-site redirects such as `/account` → `/account/login` instead of reporting them as dead links). It caught and blocked a copy leak ("movie" in a feature card while the film-licence gate is closed), fixed before release.

Fixed during this release: the admin "Minimum booking price" setting was saved but never applied to pricing; it now drives both server and browser prices.

## Update — feedback, equipment and schedule (2026-11-20, evening)
**Playwright: 59 passed, 0 failed, 18 skipped by design** (run on a freshly created local test database).

New tests: feedback link refuses a wrong token and is closed before the session; after check-in the guest rates 5★ with consent; second attempt says "already rated"; staff publish it and it appears on the home page as "Verified guest feedback". Staff-entered studio equipment appears on the Podcast and Creative Studio pages. The Schedule shows both spaces and links the booking.

Test hygiene: two older tests used one fixed date each and failed once the shared test database filled up after many runs; they now search for a free date (`freeApiSlot`). When the 60-day window is exhausted locally, recreate the test database (`dropdb`/`createdb` + `prisma migrate deploy`).

Found while checking the Schedule visually: the first version drew `pending_payment` bookings whose 15-minute hold had expired as if they still occupied the room. They don't (the engine correctly frees that time), so the Schedule now draws pending bookings only through their active hold.
