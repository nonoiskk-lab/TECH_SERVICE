# Design research update (2026-11-25)

**Source of the research.** The findings below were supplied by the owner from their own Chrome inspection of 22 live booking sites (Calendly, Cal.com, Fresha, Booksy, Vagaro, Square Appointments, Acuity, SimplyBook.me, Zoho Bookings, Setmore, GlossGenius, OpenTable, Airbnb, Mindbody, Eventbrite and others) and the public design systems of Square Market, Eventbrite Marmalade and Expedia. **The engineering side did not re-run that research or verify the individual measurements.** What was verified is our own site: every number about THIRD SPACE below was measured in this repository or in a browser.

**Rules followed.** Patterns only: no brand's font, logo, icon, copy or asset is used. No database migration, no Razorpay change, no change to booking logic (availability, holds, pricing, checkout). Changes are small and reversible (mostly one token each). Tests pass; CLS and LCP stayed inside budget. Deployed to a **preview only**; production is untouched until the owner approves.

## 1. Audit of our tokens (before the change)

Single tokens file: `src/styles/tokens.css` (values in `docs/v4/DESIGN-TOKENS.json`). Contrast measured with the WCAG formula.

| Item | Measured | Finding |
|---|---|---|
| Primary button text on gold | `#11100f` on `#c69b55` = **7.44:1**; on hover gold `#b5883f` = 5.94:1 | Already dark text. **No white-on-gold text exists** in the product (white on gold would be 2.55:1, as the research says). Nothing to fix here; the point is now covered by a test. |
| Gold as a *line* (ghost button border, focus ring, input focus) on white | **2.55:1** | Below the 3:1 WCAG asks of UI component boundaries. Fixed. |
| Input border `#e8e0d4` on white | **1.31:1** | Inputs were findable only by their fill. Fixed. |
| Selected time chip: `#11100f` text on warm `#8a6428` | **3.7:1** (and its small "until" line at 75% opacity lower still) | Would fail AA at 13 to 14 px. Not caught earlier because the axe run never selected a slot. Fixed. |
| Muted text `#585858`, faint `#666`, warm text `#8a6428` on white and ivory | 6.2:1, 5.7:1, 5.3:1 / 4.7:1 | Pass. |
| Button radius | 6 px | Tightest of all the products in the research. |
| Card radius | 14 px, input 8 px, chips `rounded-xl` (12 px), icon discs 999 px, badges 6 px | No scale; values chosen per component. |
| Token naming | `--ts-*` only | No semantic names. |
| Fonts | Fraunces (display) + DM Sans (body) | Matches the pattern "one sans UI font plus a serif or display headline font" seen at Fresha and GlossGenius. **Not changed**, as instructed. |
| Colour system | White canvas, near-black `#222`, one accent (champagne gold `#c69b55`) | Matches "white canvas, near-black text, a single accent". Not changed. |
| Booking flow | Price shown at the session step; **cancellation tiers only at the final review step**; slots already chips; **no sticky mobile CTA** (only a sticky hold timer) | Two gaps. |

## 2. What changed (all reversible)

| # | Research point | Change | Where | Undo |
|---|---|---|---|---|
| 1 | Typography | None (fonts kept). | | |
| 2 | One accent; no low-contrast pairs | Gold stays the only accent. Ghost-button border `#c69b55` → warm `#8a6428` (5.3:1). Focus ring → new `--ts-ring` `#6f4f1d` (7.5:1; light `#e2bf86` on the dark band). Input border → `--ts-border-strong` `#8a8071` (3.4 to 3.9:1). Selected slot chip text → white on warm (5.3:1), including its small sub-label. | `tokens.css`, `globals.css`, `booking-flow.tsx` | Change the three tokens |
| 3 | Consistent radius scale; pill primary CTA | Scale: `--ts-radius-xs 6`, `sm 8`, `md 12`, `lg 16`, `pill 999`. Buttons now pill (`--ts-btn-radius: var(--ts-radius-pill)`). Cards 14 → 16 (`lg`). Inputs 8 → 12 (`md`, same as the time chips). | `tokens.css`, `globals.css` | Set `--ts-btn-radius: 6px`, `--ts-radius: 14px` |
| 4 | Semantic token names in one file | Added `--background`, `--foreground`, `--card`, `--primary`, `--primary-foreground`, `--primary-hover`, `--muted`, `--muted-foreground`, `--border`, `--input`, `--ring`, `--destructive`, `--success`, `--radius`, `--shadow-sm/md/lg` as aliases of the `--ts-*` tokens, declared on every surface that re-themes (light, ivory, dark and gold bands). Existing components keep working; new code can use either name. | `tokens.css` | Delete the alias block |
| 5a | Price and cancellation policy before slot choice | New "Before you choose a time: cancellation at a glance" box above the calendar, with the same tiers as the review step (or the existing "pay at the venue" note when no online payment is taken). The price was already shown at the session step. English and Hinglish. | `booking-flow.tsx`, `i18n/en.ts`, `i18n/hi.ts` | Remove the `policy-glance` block |
| 5b | Slots as chips | Already chips; border now meets 3:1 and the selected state meets AA. | | |
| 5c | Sticky primary CTA on mobile | After a slot is held, a bottom bar shows the total and "Review and pay" (Hinglish: "Review karke pay karein"). It scrolls to the review section and **hides while that section is on screen**, so only one primary button is visible. Hidden on desktop (the summary column is already sticky there). It does not call the pay handler or touch pricing. | `booking-flow.tsx` | Remove the `sticky-cta` block |
| 5d | One primary action per screen | The sticky bar yields to the pay button as above; the hold timer stays a status, not an action. | | |

## 3. Verification

| Check | Result |
|---|---|
| Unit and database tests | 37 passed |
| End to end | **84 passed**, 0 failed (the previous 81 plus 3 new in `e2e/design-research.spec.ts`), two consecutive full runs |
| New tests | tokens exist and meet contrast (input border ≥ 3:1, primary button text ≥ 7:1, pill radius, input radius 12 px); price and policy shown before a slot, in English and Hinglish; sticky CTA appears only after a hold, gives way to the review section, is hidden on desktop; axe colour-contrast with a slot selected |
| Existing axe checks (11 pages), responsive checks (6 widths), content checks | pass |
| CLS and LCP, 15 pages in English and Hinglish, mobile throttling (4x CPU, 1.6 Mbit/s, 150 ms) | worst CLS **0.009** (budget 0.1), worst LCP **1.06 s** (budget 2.5 s); before the change 0.010 and 1.3 s |
| Visual check at 390 px | Home and booking screenshots reviewed: pill buttons, selected chip, sticky bar do not overlap the WhatsApp button |

## 4. Not done, and why

- **Fonts, logo, accent colour:** left as they are on purpose.
- **Admin and staff screens** use the same tokens, so they picked up the radius and border changes; they were not redesigned.
- **Shared skeleton loading component, dark mode, visual regression snapshots:** not part of this update.
- **Owner review:** the design system is still not owner-approved (MD-01). The pill buttons are the most visible change; one token reverts them.
- **The research measurements themselves** (which brand uses which radius or font) are the owner's and were not independently re-checked.
