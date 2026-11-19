# Stage Report

Repo `TECH_SERVICE`, folder `third-space/`, branch `claude/intelligent-ride-aojomq`, PR nonoiskk-lab/TECH_SERVICE#11.

- **Stage 1 (19 Nov 2026):** guest website from the Competitor Audit blueprint.
- **Stage 2 (19 Nov 2026):** booking software, plus the THIRD SPACE Terms v2.0 pack (Master 18+ Safety & Conduct Policy, Private Theatre / Podcast Studio / Creator Studio addenda) and the owner's Mandatory Customer Declaration.
- **Stage 3 (19 Nov 2026):** real contact details, and time + price decided automatically from what the guest wants to do.

## Stage 3: automatic time and price

Owner's rules:
- Every booking = the work itself + **30 minutes setup**, with no rounding and no minimum.
- After every booking, **30 minutes stay free** before the next one. That gap is not charged.
- Theatre time is set by the movie. Podcast and Creator Studio time is set by the work the guest describes.
- ₹799 per hour is for **space only**.

| Package | Guest tells us | Booked time | Price (before add-ons and GST) |
|---|---|---|---|
| THIRD SPACE Cinema | Which title (from the admin's licensed list) | Runtime + 30 min setup | ₹850/hr × time |
| THIRD SPACE Premium | Which title | Runtime + 30 min setup | ₹1,350/hr × time |
| Podcast Session | Episode length (15–90 min) × episodes (1–4) | Recording + 30 min setup | ₹950/hr × time |
| Creator Studio Shoot | Reels (15 min each) and longer videos (30 min each) | Shoot + 30 min setup | ₹950/hr × time |
| Studio Space Only | Hours (1–6) | Hours (no setup added) | ₹799/hr × hours |
| Monthly Creator Plan, free visit | Nothing | Fixed (2 h first session / 10 min) | ₹4,999 / free |

- **What the guest sees while booking:** the work time, "+ 30m setup", the total time and price, and a note that 30 minutes are kept free after the session (not charged).
- **Slot buttons** show start and end time. The hold banner shows the full time range.
- **Where the rules live:** rates are in `src/config/packages.ts`, setup and limits in `sessionRules` (`src/config/site.ts`), and the gap in `hours.bufferMinutes`. The resolver is `src/lib/session.ts`; the browser and the server run the same code. Checkout recomputes time and price and rejects a hold whose length no longer matches (409).
- **Minimum booking price ₹799 (owner's decision):** every paid booking costs at least ₹799, before add-ons and GST. A short session keeps its real time, and only the price is raised. For example, a 15-min podcast + 30 min setup = 45 min, ₹713 by time, charged ₹799; the guest sees a note saying so. The value is `sessionRules.minimumCharge`. The site's "From" price is therefore ₹799, which is also the real lowest price.
- **Admin `Titles` page:** staff list licensed titles with runtime, language, certification and a mandatory licence reference. Guests see titles only while the Legal Gate is open.
- **Contact details** are in config everywhere: +91 90316 27292, sandeep@mythirdspace.co.in, and Ground Floor, Om Sai Plaza, Police Line Road, Near HDFC Bank, CMPF Colony, Hirapur, Dhanbad, Jharkhand, with a Maps link.
- **Verified:** 39 e2e tests pass in both gate states, including:
  - 3 × 45 min podcast = 2h 15m + 30m = 2h 45m → ₹2,613
  - a 120-min title → 2h 30m → ₹2,125 / ₹3,375
  - a 90-min session blocks its end time plus 30 min, so the next start is 2h later
  - the hold is released when the session changes
  - the server rejects a mismatched hold

  Content checks pass in both gates; the gate check caught a "Movie" label leaking while closed, which is now "Running time".

## What Stage 2 added

**Booking software (Postgres via Prisma)**
- **Persistent data:** bookings, slot holds, staff slot blocks, payment orders, enquiries, OTP codes, analytics counts. Nothing is lost on restart.
- **No double booking:** every hold and booking takes a per-space Postgres advisory lock. Spaces are the room (Watch/Celebrate) and the studio (Podcast/Creator/Visit), with a 30-minute buffer after each booking.
- **Payments:** a real Razorpay adapter (order + signature check). It is used automatically once keys are set; without keys the mock is used and no money moves.
- **Paid after hold expired:** if a payment arrives after the hold ran out, it is flagged on the dashboard for a refund or rebook.
- **Guest confirmation link:** carries a secret token, so a booking ID alone shows nothing.
- **Admin panel `/admin`:**
  - today's schedule and a go-live readiness checklist
  - bookings: check-in, balance, completed / no-show, cancel with refund suggested by the tiers, stop session
  - slot blocking, incident register, leads, a message outbox for WhatsApp/email, policy acceptance counts
  - audit log
- **Staff login:** shared password plus the staff member's own name, which goes into the audit log.

**Policy pack v2.0**
- **Pages:** `/policies` has the easy summary, document links and version history. `/policies/safety` has all 11 sections of the Master Policy. `/policies/podcast`, `/policies/creator` and `/policies/theatre` hold the addenda; the theatre one exists only while the Legal Gate is open.
- **Wording:** legal text is word-for-word from the PDFs, in English.
- **Section 11** (legal entity, grievance officer, effective date) is filled from env. A line whose value is missing is left out, never shown as a "[PLACEHOLDER]".
- **Draft note:** policy pages say "Draft under legal review" until `POLICY_STATUS=final`.

**Checkout (policy section 10 + your declaration)**
- **Before payment:** the plain-language summary and clickable links to the full Master Policy and the service's addendum.
- **Mandatory Customer Declaration:** all 6 points plus the closing line, word-for-word, with an initially unchecked box. Pay stays disabled until it is ticked, and the server refuses a booking without it (tested).
- **Other mandatory boxes:** venue rules and cancellation tiers; recording permission for Podcast and Creator Studio.
- **Optional boxes, kept separate:** promotional use of the guest's image/voice and marketing messages. Neither is bundled into the mandatory acceptance.
- **Guest count:** asked at checkout and capped at the package capacity.
- **What is stored per booking:** policy pack version, documents with versions, the exact declaration text, language, timestamp, booking ID and the affirmative action (`checkbox:declaration`).
- **Downloadable copy** of the acceptance on the confirmation page.

**18+ across the site**
- An "18+ only" badge on the home page.
- FAQ answers on children and ID.
- 18+, no smoking/alcohol/drugs and minimal ID recording added to the venue rules and privacy points.
- At check-in, staff record only how many guests were seen as 18+. ID numbers and images are never asked for or stored.

**Creator Studio** is now its own service, with a package, its own addendum and recording consent.

## VERIFIED (run in this session)

| Check | Result |
|---|---|
| `tsc`, `eslint`, `next build` | Clean |
| Playwright at 390 px, both gate states, local Postgres | **31 passed**, 11 skipped by design (gate-specific and admin-only tests). Passed twice in a row on the same database |
| Declaration | Starts unchecked; Pay disabled until ticked; server returns 400 without it or with too many guests; confirmation shows "version 2.0"; downloaded copy contains the declaration, pack version, addendum and optional-consent answers |
| Confirmation privacy | Booking page without the token shows "not found" |
| Admin | Wrong password refused. Check-in refused without the ID confirmation, then records "18+ verified for 2 of 2". Balance recorded. Audit log has the actions and no phone numbers. Stop session opens an incident; notes are appended. Blocked studio time shows as `blocked` on the public availability API. Booking confirmations are queued in Messages |
| Policies | All 11 Master Policy headings render; podcast/creator addenda render; theatre addendum 404 while the gate is closed, 200 when open |
| Content checks, both gates | Pass (placeholders, consistency, dead links, error text, claims, Legal Gate). The gate check correctly flagged the policy's legal "OTT/digital publisher" and "promote, film or livestream" wording; those two exact phrases are allowlisted |
| Client JS while gate closed | No "cinema" or "film screening" text in any chunk |

From Stage 1 and not re-measured: Lighthouse mobile (local) Home 93/100, Create 94/98, Book 95/100, Watch 95/98.

## UNVERIFIED

- **Razorpay:** the adapter is built to Razorpay's documented API but was not run against real keys. Test in Razorpay test mode before launch.
- **CI on GitHub:** the workflow now starts a Postgres service. It has not run on GitHub yet.
- **Deployment:** no production deploy has been done. Hosting on Vercel needs a hosted Postgres such as Supabase.
- **Real phone and real 4G.**

## Still mocked / not connected

| Piece | State |
|---|---|
| OTP delivery | Codes are stored hashed in Postgres with expiry and attempt limits. No SMS provider: in `OTP_MODE=mock` the code is `123456` and the screen says "Test mode" |
| WhatsApp / email confirmations | Queued in the outbox; staff send them from `/admin/notifications` (wa.me / mailto) and mark them sent |
| Payments | Mock until `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are set |
| Refund payout | The panel records the refund amount; staff pay it out in the Razorpay dashboard |

## NEEDS OWNER

**From the policy pack ("must be confirmed before publication")**
1. Legal entity name and address, grievance officer (name, designation, email, phone, postal address) and effective date. Set the env vars in `.env.example`; the admin readiness panel lists what is missing.
2. Written approval from an Indian/Jharkhand advocate. Then set `POLICY_STATUS=final`.
3. **Refund treatment after a policy breach.** The panel suggests the normal tiers, and staff can enter any amount up to the advance. The policy says refunds may be withheld "to the extent permitted by the disclosed policy", so the disclosed rule needs your decision.
4. **Political/religious events:** the text allows them only with written approval. Confirm whether you prohibit all of them or only unapproved ones.
5. Exact ID-check process, CCTV signage and retention period, privacy retention schedule, local permissions, fire/occupancy approvals, film/music rights.

**From Stage 1 (still open)**
6. ~~Rates~~ **Confirmed by owner (19 Nov 2026):** Cinema ₹850/hr, Premium ₹1,350/hr, Podcast and Creator ₹950/hr, Space only ₹799/hr, ₹799 minimum booking, 30 min setup, 30 min gap.
7. ~~Space only~~ **Confirmed:** studio only, not the private room.
8. **Other assumed defaults:** add-on prices, refund tiers (90/50/0), hours 10 AM–10 PM, GST 18% on top, capacities.
9. **Logo and room photos.**

**New in Stage 2**
10. **Creator Studio Shoot:** capacity 4 and "bring your own camera" are my placeholders. Confirm them.
11. **Shared space:** Podcast and Creator Studio are assumed to share one studio, so they cannot overlap. Say if they are separate rooms.
12. **Providers:** an SMS/WhatsApp OTP provider, a WhatsApp/email sender, Razorpay keys and a hosted Postgres.
13. **Staff accounts:** one shared password today. Per-person accounts and roles can be added if needed.

## How to test on your phone

1. On a computer, follow `README.md` (Postgres, `.env`, `npx prisma migrate deploy`, build, start). On the phone, open `http://<computer-ip>:3000`.
2. Book a Podcast Session:
   - Pick a slot.
   - Choose the guest count.
   - Verify OTP `123456`.
   - Read the terms summary and open the full policy links.
   - Tick the declaration, venue rules and recording boxes.
   - Pay the advance (mock).
   - Download your declaration copy.
3. Open `/admin/login` with your name and `ADMIN_PASSWORD`:
   - Open the booking and check in.
   - Record the balance.
   - Try "Stop session" and look at the incident.
   - Block a slot and see it disappear from the booking page.
