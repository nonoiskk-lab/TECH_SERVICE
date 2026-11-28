# Missing decisions register

**Date:** 2026-11-23. **Phase:** 0.

These decisions are needed from the owner. Nothing here has been decided by the engineering side. Where a value is already in the code, it is the current default, not an approved rule.

**Priority:**
- **P0** blocks Gate 0 or Phase 1.
- **P1** blocks the phase named in the "Blocks" column.
- **P2** can wait until V1.1 or later.

| ID | Decision needed | Current state (evidence) | Options | Recommendation | Priority | Blocks |
|---|---|---|---|---|---|---|
| MD-01 | Primary design and research reference | Skedda Reports 1–12 **missing**. The live site follows the Perfect Venue audit (Measured). | (a) Supply the Skedda document. (b) Waive it and approve the Perfect Venue audit plus `DESIGN-SYSTEM.md`. (c) Commission an original design. | (a) if it exists; otherwise (b) | **P0** | Gate 0, Phase 2 |
| MD-02 | Re-approve launch package prices | BR-04 from the owner chat (19 Nov), draft per V4 Phase 6 | Approve as-is, or give new prices | Approve or revise before V1 launch | **P0** | Phase 6, V1 |
| MD-03 | GST rate and whether prices are inclusive or exclusive | 18% exclusive (seed setting, Inferred) | 18% exclusive, 18% inclusive, not registered yet | Confirm with the accountant | **P0** | FIN-03, PAY-09 |
| MD-04 | Online advance percentage | 50% (seed, Inferred) | 25%, 50%, 100% | Owner choice | **P0** | PAY-08 |
| MD-05 | Refund tiers | ≥72h 90%, ≥24h 50%, <24h 0% (seed, Inferred; also in the draft policy) | Confirm or revise | Must match the approved policy text | **P0** | FIN-04, CUS-04 |
| MD-06 | Role mapping from the current 5 roles to V4's 8 | super_admin, studio_manager, booking_manager, finance_manager, staff (Verified) | Map one-to-one, add Theatre/Studio Operator, Business Owner | Keep super_admin, split staff into Studio and Theatre Operator, add Business Owner (read-mostly) | P1 | Phase 11, OPS-03 |
| MD-07 | Self-reschedule rule | Once, ≥24h before, same package and length (Proposed, implemented) | Confirm, change count or window, or staff-only | Confirm | P1 | CUS-05 |
| MD-08 | Invoice details: GSTIN, legal name, address, numbering format | Unknown | — | Owner supplies; gap-free series per financial year | P1 | FIN-05 |
| MD-09 | Opening hours and checkout hold length | 10:00–22:00 daily, 15-minute hold (seed, Inferred) | Confirm or change per space and weekday | Confirm | **P0** | BKG-01, BKG-02 |
| MD-10 | WhatsApp provider | Not configured; code supports a provider adapter | Meta Cloud API direct, Gupshup, Interakt, AiSensy | Meta Cloud API (no middleman fee) if the owner can verify the business | P2 | CRM-03, V1.2 |
| MD-11 | Recording file storage and retention | `RecordingFile` with token links; storage not chosen | Supabase Storage, Cloudflare R2, Google Drive links | Supabase Storage (same vendor, private buckets); retention 30 days | P1 | OPS-06 |
| MD-12 | Backup targets and Supabase plan | Unknown. No restore tested. | Free plan (no PITR), Pro (daily backups), Pro + PITR | Pro plan; RPO ≤ 24h, RTO ≤ 4h; quarterly restore drill | **P0** | NFR-05, Phase 13 |
| MD-13 | Staging database for Preview deployments | Preview uses the **production** DB (F-04) | New Supabase project, Supabase branch, or disable Preview migrations | New free Supabase project for staging | **P0** | Phase 1 onward |
| MD-14 | Money migration to integer paise | Integer rupees today (Verified) | Migrate all money columns with backfill ×100, or keep rupees | Migrate (V4 locked: paise); one migration, one release | **P0** | FIN-01, Phase 4 |
| MD-15 | Database-level overlap prevention and resource model | Advisory locks only (Verified) | `btree_gist` exclusion on a `booking_resources` range table, or keep app locks | Exclusion constraint (V4 BKG-03) | **P0** | BKG-03, BKG-04 |
| MD-16 | Approve CI fixes F-01 and F-02 | CI red since run 23 (Verified) | Approve, or fix differently | Approve both (config-only; no product change) | **P0** | NFR-10, every phase |
| MD-17 | Remove or restrict the bootstrap `ADMIN_PASSWORD` login | Enabled alongside staff accounts (Verified) | Remove, restrict to break-glass with audit, keep | Break-glass only, with audit entry and alert | P1 | SEC-09 |
| MD-18 | Razorpay account and test keys; custom domain | No keys, no domain (Verified) | — | Owner creates the Razorpay account and shares **test** keys through Vercel env (never in chat); buys the domain | P1 | PAY-01..07 live testing, V1 launch |

## Already decided (not open)

The V4.0 locked decisions are recorded in `DECISION-REGISTER.md`. They are not reopened here.

## How to answer

Reply with the decision ID and the choice, for example: `MD-04: 50%`, `MD-12: Pro, accept recommendation`. Each answer will be recorded in `DECISION-REGISTER.md` with the date.
