# Design system (v6)

**Source.** The owner's document *"Third Space: Cinema Design System Audit & Build Plan"* (2026-11-25). It audits the "Cinema tickets booking app" Figma file and plans a Third Space system from it: warm espresso and amber colours, Poppins, a dark customer app, a light staff dashboard, a component list and ten screens. This page records what was **built in code from that plan**, what was measured, and where the build deliberately differs.

**Credit (CC BY 4.0).** The plan is derived from *Cinema tickets booking app* by Yuriy Apretov (Figma Community, CC BY 4.0). Required credit line: **"Based on Cinema tickets booking app by Yuriy Apretov (CC BY 4.0)"**. No file, image, movie poster or text from that file is in this repository; only the structure of the component list was reused, with new names, tokens and code. The product also uses no Perfect Venue or Skedda asset.

**Status.** Implemented and tested. **Not yet approved by the owner and not on production** (preview only). The Figma file (the owner's copy of the Cinema file) was not used or checked: the plan says its components and screens were never finished, and this build lives in code.

## 1. Tokens (single file: `src/styles/tokens.css`; machine-readable copy in `docs/v4/DESIGN-TOKENS.json`)

Layers: primitives `--p-*` (the 38 colours below) → semantic `--ts-*` (older names kept) and shadcn-style aliases (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--input`, `--ring`, `--radius`, shadows) → component CSS in `globals.css`.

| Token | Dark (customer app, public site) | Light (staff dashboard, admin: `.theme-light`) |
|---|---|---|
| bg main | `#14110F` | `#FBF6EE` |
| bg surface | `#231D18` | `#FFFFFF` |
| bg surface deep | `#2E261F` | `#F3EBDD` |
| border (decorative) | `#3B3128` | `#E4D8C6` |
| border strong (inputs, chips) | `#85735F` | `#857A68` |
| text main | `#FBF6EE` | `#14110F` |
| text muted | `#A39484` | `#6B5D4F` |
| primary (amber) | `#F2A33A`, hover `#F7B455`, pressed `#C77F1A` | same fill; text use `#8A5300` |
| text on amber, ember, teal | `#100D0B` | `#100D0B` |
| mode theatre (ember) / podcast (amber) / studio (teal) | `#E4572E` / `#F2A33A` / `#3FB3A3` | same fills; as text `#B5361A` / `#8A5300` / `#0E7C70` |
| positive / negative (text) | `#5CC48E` / `#F28C84` | `#2E7D55` / `#A8362E` |
| focus ring | `#F7B455` | `#8A5300` |

Spacing `--space-xxs … 3xl` = 4, 8, 12, 16, 20, 24, 32, 48. Radius 6, 8, 12, 16, 24, pill. Effects: `--ts-glow-primary` (amber glow), `--ts-shadow-cover`, `--ts-shadow-card`, glass (`.ts-glass`: translucent surface with a 16 px blur, used by the top bar and sticky bars).

**Type (Poppins, Latin and Devanagari, OFL, via `next/font`, `display: optional`).** Display/L 32/40 bold · Heading H1 24/32 · H2 20/28 · H3 16/24 (semibold) · Body L 16/24 · M 14/20 · S 12/16 · Label/M 14/20 · Label/Button 14/20 · Caption 12/16 · Overline 12/16 uppercase · Price/L 24/32 bold. Classes `.t-display … .t-price`; `h1`–`h4` map to Display, H1, H2, H3. The smallest text anywhere is 12 px (the Cinema file had 6 px text).

## 2. Contrast (WCAG 2.x formula, computed, then enforced by axe on 20 pages)

| Pair | Ratio |
|---|---|
| Dark: text on bg / surface / deep | 17.5 / 15.5 / 13.8 |
| Dark: muted on bg / surface / deep | 6.4 / 5.7 / 5.0 |
| Dark: amber text on bg / surface / deep | 9.0 / 8.0 / 7.1 |
| Ink `#100D0B` on amber / ember / teal | 9.3 / 5.3 / 7.6 |
| White on ember (why text on fills is always ink) | 3.7 |
| Light: text / muted on bg | 17.5 / 5.9 |
| Light: amber-as-text `#8A5300` on bg / surface / deep | 5.9 / 6.3 / 5.4 |
| UI borders (inputs, chips) dark / light, worst surface | 3.3 / 3.6 |

## 3. Components (from the plan's list)

| Plan component | Built as | Notes |
|---|---|---|
| Button (Primary, Ghost; Large 56, Small; Default, Disabled) | `.ts-btn`, `-primary`, `-ghost`, `-lg` | Primary uses ink text on amber; hover glow; pressed amber. Pill radius (one token). |
| Service Card (Theatre, Podcast, Studio) | `ModeServices`, `.ts-service-card` | Mode colour bar; meta; "From ₹"; Book or "Opening soon" while the Legal Gate is closed. |
| Mode Tab | `.ts-tab` in `ModeServices` | All, Theatre, Podcast, Studio; ARIA tabs. |
| Date Chip | `.ts-chip` strip in `BookingCalendar` | Next 14 days; full or unavailable days are disabled. |
| Slot Chip (Available, Selected, Booked, On hold) | `.ts-chip` | `data-status` drives the four states; booked is struck through, on hold is dashed. |
| Package Card (Selected) | `.ts-package-card` | Amber border and glow when selected. |
| Guest Stepper | `.ts-stepper` | Respects the package maximum (4 or 5). |
| Add-on Row | `.ts-option-row` | Checkbox stays visible. |
| Input Field (Default, Focus, Error, Filled) | `.ts-input` | 3:1 border, amber focus ring, `aria-invalid` red. |
| Status Badge (Confirmed, Pending advance, Completed, Cancelled) | `StatusBadge` | Always text, never colour only; used on the customer and admin sides. |
| Booking Card | account booking row | Status badge, manage link. |
| Summary Row | `.ts-summary-row` | Emphasis row for the total. |
| Top Bar | `.ts-topbar` + `.ts-glass` | Public header and staff header. |
| Tab Bar | `TabBar` | Home, Bookings, Profile; phones only, on the account and My Booking pages. |
| Stat Card | `.ts-stat` | Dashboard and daily report. |
| Booking Block (Theatre, Podcast, Studio) | `DayLanes` | Three lanes, blocks in mode colour. |
| Table Row, Sidebar Item | existing admin list and the admin navigation row | Not rebuilt as new components. |
| Payment Method Row (UPI, Card) | **not built** | No online payment method exists until Razorpay is connected. |

## 4. Screens

Customer (dark, responsive; the plan's 375 px app layout is the phone layout of the website):
1. **Home**: the headline "Your Voice. Your Space. Your Story.", mode tabs, three service cards, Monthly Creator Plan banner.
2. **Service details**: the existing theatre, podcast and creative-studio pages (restyled; room photo placeholders stay until real photos exist).
3. **Date and slot**: date chips, month calendar, slot chips, price and cancellation summary before the slots.
4. **Package and add-ons**: package cards, guest stepper, add-on rows.
5. **Review and pay**: input fields, summary rows, cancellation policy, declaration; the pay button says what actually happens (pay at venue until Razorpay is connected).
6. **Booking confirmed**: ticket with a **check-in QR** (it encodes the staff link `/staff/<booking id>`, which needs a staff login) and an honest delivery note: it says "sent on WhatsApp/email" only if a message was actually delivered; otherwise it says the confirmation will follow.
7. **My bookings** (account): booking cards with status badges, **plan hours used** with a progress bar, payment history, messages, recordings via the booking page; the mobile tab bar.

Staff dashboard (light):
- **Day calendar**: Theatre, Podcast and Studio lanes (`laneOf`: private room is Theatre; creator content is Studio; the rest of the studio is Podcast), stat cards (bookings, advance collected, booked value).
- **Bookings table**: the existing bookings list with status badges and filters.
- **Daily report and checklist** (`/staff/checklist`): projector and audio test, mic and camera test, room sanitisation, recordings backed up and delivered, closing check; who did it and when; a daily report (live bookings, completed, no-shows, incidents, payments received) and an end-of-day note. Stored per day in the `Setting` table (no migration); only today can be edited; every change is audited.

## 5. Where the build differs from the plan (on purpose)

| Plan | Build | Why |
|---|---|---|
| Button Small 40 px | 44 px | The project requires 44 px touch targets (tested). |
| Negative `#E5635A` | `#F28C84` as text in the dark theme | `#E5635A` is 4.4:1 on the deep surface; the lighter value is 5.3:1. The fill colour is unchanged. |
| Display 32/40, H1 24/32, H2 20/28 only | Scaled to 48/56, 32/40, 24/32 from 1024 px | The plan defines app sizes; the website has desktop widths. |
| Single "Light" theme collection in Figma | CSS themes (`:root` dark, `.theme-light`) | Code has no one-mode-per-collection limit. |
| "Confirmation WhatsApp par bhej di gayi" | Shown only if a message was sent | No messaging provider is connected, so the old text would have been false. |
| Staff scan the QR | QR opens the booking in the staff portal after login | No in-app scanner; any phone camera works. |
| Status colours on tinted badges | Text colours chosen so every badge is at least 4.5:1 on every surface | axe found the first values too light. |

## 6. Verification

| Check | Result |
|---|---|
| Unit and database tests | 46 passed (7 files, incl. lane geometry, checklist state) |
| End to end | 93 passed, 0 failed, 52 skipped by design; two consecutive full runs |
| axe WCAG 2.1 A/AA, serious and critical | 0 on 20 pages in 13 tests: 11 public pages (dark), the signed-in account page, and 8 light staff/admin pages (login plus 7 screens) |
| Layout widths | no sideways scroll at 360, 768, 1024, 1280, 1440 px (public) and 360, 390, 768, 1280 px (staff and admin) |
| CLS and LCP, mobile throttling, 32 page/language combinations | worst CLS 0.000 (budget 0.1), worst LCP 1.23 s (budget 2.5 s) |
| Typecheck, lint, production build | pass, zero errors |
| `npm audit` | 0 critical, 4 high (Prisma CLI, build time; unchanged); the new `qrcode` package adds none |

Defects found and fixed while building: grid column widened by the date strip (page overflow); heading rules outside the CSS layer overrode Tailwind sizes (admin titles 48 px); staff header too wide on phones (page zoomed out); `dl` with a stray element and a non-focusable scroll region (axe); status badge contrast on tinted backgrounds (axe); date chip accessible name not containing its visible text (axe).

## 7. Not done

- The Figma library (the owner's Figma copy) was not built or synced; this is code only.
- Payment Method Row (needs Razorpay).
- Customer-facing notification delivery is still only as real as the provider connection (none).
- Real photography; the owner has not reviewed the dark theme on a real phone.
- Enquiry owner on the bookings table (the plan lists it; leads have no owner field).
