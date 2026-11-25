# Design system

The full specification with evidence classes is in `docs/v4/DESIGN-SYSTEM.md` and machine-readable tokens in `docs/v4/DESIGN-TOKENS.json`. This page records what is implemented and verified today.

## Status

Implemented (v5, light). **Not approved by the owner.** Direction follows the owner's request (a Perfect Venue style structure); no Perfect Venue logo, image, copy or font is used, and Skedda's brand is not used. Skedda Reports 11 and 12 are missing, so no requirement was taken from them.

## Tokens (source of truth: `src/styles/tokens.css`)

- Surfaces: light (white and ivory `#f7efe4`), dark espresso `#201a17`, gold `#c69b55`, selected through `.ts-band-light`, `.ts-band-dark`, `.ts-band-gold`.
- Text: `--ts-text #222`, `--ts-text-muted #585858`, `--ts-text-faint #666` (raised from `#7a7a7a` after the axe check: 4.29:1 → 5.7:1 on white), gold text `#8a6428`.
- Type: Fraunces (display), DM Sans (body), Noto Sans Devanagari; all OFL, served by `next/font`. Fraunces and DM Sans use `font-display: optional` so late font loading cannot shift the layout.
- Shape and size: buttons 6 px radius at 44 px (60 px for hero CTAs), cards 14 px, tap target 44 px, content width 1200 px.
- Motion: 400 ms, translate-only reveals, disabled under `prefers-reduced-motion`.
- Status chips (`Status` in `components/admin/ui.tsx`) always carry text, never colour alone.

## Components

`Container`, `PageHeader`, `Section`, `PackageCard`, `Faq`, `HowItWorks`, `BulletList` in `components/ui.tsx`; buttons and inputs are classes (`.ts-btn`, `.ts-input`); booking flow and calendar; forms for account, guest, feedback and reschedule; admin primitives (`Card`, `Field`, `ActionForm`, `Status`, `H1`) reused by the staff portal.

## Verified

- 390 px: no horizontal scroll and 44 px targets on key pages (e2e).
- axe WCAG 2.1 A/AA, serious and critical: 0 violations on 11 pages at 390 px.
- Chromium shows no CSP violations on the six pages checked.

## Gaps

- Layout checks (no sideways scroll, hero button visible) run at 360, 768, 1024, 1280 and 1440 px as well as 390 px; visual regressions are not automated.
- Empty and error states exist for the main flows (no-result lists, form errors, unavailable slots); loading is shown by disabled calendar days and button states. There is no shared skeleton component.
- Modals are not used; confirmations are inline.
- Staff portal and admin share the admin look; they have not had a separate design pass.
- Real photography is missing.
