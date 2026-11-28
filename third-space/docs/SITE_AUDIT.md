# Site audit and redesign (19 Nov 2026)

Owner's brief: audit the live THIRD SPACE site, adopt the **design system** of mwsindia.in (MW Stuudio, Mumbai), and keep the booking system built for THIRD SPACE's own targets.

We used MW Stuudio's site for its **visual patterns only**. No text, logo, photos or layout were copied (originality rule in `COMPETITOR_AUDIT.md`).

## 1. What we took from mwsindia.in's design system

Measured from the live page (computed styles, desktop and 390 px screenshots).

| Pattern on mwsindia.in | THIRD SPACE now |
|---|---|
| Light grey page (#F6F6F6), white cards, dark footer | Same structure. Tokens in `src/styles/tokens.css`; the footer and the Stories band use `.ts-dark` |
| Warm gold accent (#CAA05C) | `--ts-gold` #CAA05C for fills (dark text on top). `--ts-warm` #8A6428 for gold **text**, so it passes 4.5:1 contrast (their gold text on white does not) |
| Display headings in Cal Sans, body in Golos Text | Same two Google Fonts. Cal Sans has one weight, so fake bold is switched off |
| Two-tone headings (first words gold, rest near-black) | `TwoTone` / `Section accent=…` with our own copy ("Pick your **experience**", "Clear prices, **no surprises**") |
| Eyebrow labels with a gold dot ("• WHO WE ARE") | `.ts-eyebrow` on every section |
| Pill buttons with a round gold arrow | `.ts-btn-arrow` |
| Hero: big heading left, round image collage right | The same layout. While no photos exist, the collage uses our own line icons (mic, camera, cake) in gold, white and black circles |
| Rounded white cards with soft shadow | `.ts-card` (24 px radius) + `.ts-glow` |
| "Studio Tour" pill in the header, floating WhatsApp | "Visit the room" pill in the header (desktop), floating WhatsApp |
| Step-by-step "How working with us works" | "Step 1–4" cards |

## 2. Problems on mwsindia.in that we avoided

- **Clipped heading on mobile:** a heading runs off the screen behind the WhatsApp button. Our headings wrap (`overflow-wrap: anywhere`), and the WhatsApp button is smaller on phones.
- **Walls of text:** long paragraphs. We keep short, scannable cards.
- **Empty spaces:** blank image cards and a large blank band where images failed to load. We show no image area until real photos exist.
- **No prices:** prices are hidden on the page. Ours are on the home page (price list) and in every package card.
- **Gold text contrast:** their gold text on light backgrounds is below WCAG contrast. Ours uses darker gold for text.

## 3. Audit of the live THIRD SPACE site, and what was fixed

| # | Finding | Severity | Fix |
|---|---|---|---|
| 1 | Live site runs "pay at venue", but text still promised an online advance (home step 3, FAQ "pay 50% online", Terms "confirmed after the advance is paid", refund tiers at checkout) | **High**: misleading to guests | Copy now follows the payment mode. With no online payment: "Confirm your booking / pay at the venue", the FAQ says nothing is taken online, Terms say a booking ID confirms it, refund tiers are hidden at checkout and explained on Policies. Tested in the `live-mode` e2e project |
| 2 | Dark theme did not match the wanted brand look | Medium | Light studio design system (section 1) |
| 3 | No photos or logo; trust signals are weak | Medium | Icon collage for now. **NEEDS OWNER:** room photos and logo |
| 4 | Header had no low-commitment CTA | Low | "Visit the room" pill in the header |
| 5 | WhatsApp button could cover text on small phones | Low | 48 px on phones, 56 px on larger screens |
| 6 | Hinglish home heading changed with the redesign | — | Updated, and test updated |

## 4. Checks after the redesign

- 42 Playwright e2e tests pass (gate closed, gate open, live mode).
- Content checks pass in both gates.
- Lighthouse mobile, local production build, performance / accessibility:

| Page | Performance | Accessibility |
|---|---|---|
| Home | 96 | 100 |
| Create | 95 | 98 |
| Book | 97 | 100 |

## 5. Demo visuals (owner asked us to make them)

The owner asked us to make the demo visuals ourselves. They are **original** artwork, not stock or other businesses' photos:

- **Logo:** a doorway in a gold circle (the "third place" between home and work) plus the THIRD SPACE wordmark. Files: `public/brand/logo-mark.svg` and `src/app/icon.svg` (favicon).
- **Illustrated scenes:** podcast studio, creator set, private room and celebration (`src/components/illustrations.tsx`). They appear in the hero collage, the home service cards and the page headers of Create, Celebrate, Visit and Watch. Each one is a single component, so a real photo can replace it later.

## 6. Still open (owner)

- Real photos of the studio and the room. They will fill the hero collage and the cards.
- The logo file.
- Real Google reviews, once they exist. mwsindia.in shows a rating; we will show only verified ones.
