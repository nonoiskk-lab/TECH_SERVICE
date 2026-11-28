# Design system specification

**Date:** 2026-11-23. **Phase:** 0. **Status:** Implemented (design v5), **not approved**. Approval depends on MD-01.

## 1. Source and evidence

| Input | Evidence class | Use |
|---|---|---|
| Skedda Report 11 (visual specification) | **Unknown**: document missing | Not used. Nothing was assumed from it. |
| Perfect Venue design audit (`docs/audit/`, browser-measured) | Measured | Layout rhythm, button sizes, section spacing, band pattern, FAQ pattern. Owner decision OWN-6. |
| THIRD SPACE brand (Champagne Gold, espresso, ivory) | Documented (blueprint PDF) | Colour palette and tone |
| Current implementation `src/styles/tokens.css` | Verified | Token values in `DESIGN-TOKENS.json` |

THIRD SPACE uses its own name, colours, type and illustrations. No logo, image, icon or copy from Perfect Venue or Skedda is in the product. The audit screenshots are kept out of git.

**Open decision (MD-01):** approve this system, or replace it after the Skedda Report 11 is supplied, or commission an original system. Changing it later is a restyle of tokens and section components, not a rewrite: pages use tokens and shared components.

## 2. Foundations

**Colour.** Three surfaces, set by a band class on the section:

| Band | Class | Background | Text | Accent |
|---|---|---|---|---|
| Light (default) | `.ts-band-light` | white or ivory `#f7efe4` | `#222222` | gold text `#8a6428` (5.4:1 on white) |
| Dark | `.ts-band-dark` | espresso `#201a17` | `#f3e9d8` | `#d6ad6a` |
| Gold | `.ts-band-gold` | `#c69b55` | `#11100f` | `#11100f` |

Primary buttons are gold `#c69b55` with near-black text `#11100f`. Status colours: ok `#2f7a43`, danger `#b3261e`. Text on every band meets WCAG AA (4.5:1) for body sizes. This is checked by eye and contrast calculation; an automated axe check is not yet in CI (NFR-06).

**Type.**
- Display: Fraunces (500–900), for headings.
- Body and UI: DM Sans (400, 500, 700).
- Hindi script: Noto Sans Devanagari.
- All fonts are OFL-licensed and served through `next/font`.

**Spacing and size.**
- Section padding 64px (mobile), 110px (large).
- Content width at most 1200px.
- Tap targets at least 44px.
- Buttons 44px high (nav, default) and 60px (hero and section CTAs), radius 6px.
- Cards radius 14px, small elements 8px.

**Elevation.** Card shadow `0 1px 10px rgba(179,168,153,.35)`. Nav shadow `0 0 20px rgba(0,0,0,.08)`.

**Motion.** 400ms with `cubic-bezier(.2,.7,.2,1)`. Reveals translate only, never hide content with opacity. Motion is disabled under `prefers-reduced-motion`.

**Breakpoints.** 360, 390, 768, 1024, 1280, 1440px (WEB-05). Only 390px is covered by automated tests today.

## 3. Components (implemented)

| Component | File | Notes |
|---|---|---|
| Container, PageHeader, Section, PackageCard, Faq, HowItWorks, BulletList, Sparkle, TwoTone | `src/components/ui.tsx` | Buttons are CSS classes (`.ts-btn` and variants in `globals.css`), not a component |
| Header and mobile nav | `site-header.tsx`, `site-chrome.tsx` | Sticky; nav items do not wrap |
| Footer | `site-footer.tsx` | |
| Marketing sections (hero, feature band, steps, testimonials, FAQ, CTA band) | `site-sections.tsx` | FAQ uses native `<details>` |
| Price list | `price-list.tsx` | Prices come from the catalogue only (WEB-02) |
| Booking flow, calendar, receipt | `booking-flow.tsx`, `booking-calendar.tsx`, `booking-receipt.tsx` | Month view with available, full and closed days |
| Forms | `guest-forms.tsx`, `account-forms.tsx`, `enquiry-form.tsx`, `feedback-form.tsx`, `reschedule-form.tsx` | Labels always visible; errors in text, not colour only |
| Floating WhatsApp / call | `floating.tsx` | |
| Admin UI | `src/components/admin/*` | Same tokens; denser tables |

## 4. Rules

1. Pages use tokens and shared components only (WEB-06). No raw hex values in page files.
2. One H1 per page. Headings follow order.
3. Every interactive element is at least 44 × 44px and has a visible focus ring.
4. Colour is never the only signal (status chips have text).
5. Prices and times are formatted for India: `₹1,699`, `10:30 AM`, Asia/Kolkata.
6. Hinglish copy uses the same components; text must fit without overflow at 360px.

## 5. Gaps before approval

- Owner review of the live site against this specification.
- Automated checks at all six breakpoints and an axe accessibility scan.
- Real venue photography (currently illustrations and placeholders).
- Staff portal screens (Phase 10) are not yet designed.
