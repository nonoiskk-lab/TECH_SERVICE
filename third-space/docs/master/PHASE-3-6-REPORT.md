# Phases 3–6 report

## Completed
- Brand: "Your Voice. Your Space. Your Story.", "By LovBites Hospitality Group", positioning line; cinematic palette #11100F / #201A17 / #C69B55 / #F3E9D8, Cormorant Garamond headings + Inter body.
- Pages: Home, Private Theatre, Podcast & Creator Studio, Booking, Birthday & Anniversary, Creator Monthly Plans, Gallery, About, FAQs, Contact, My Booking, Privacy, Terms, Cancellation & Refund (+ Rules & Policies, Visit, local SEO pages). Old routes redirect.
- Home: cinematic hero + Book CTA, space cards, popular packages, price table, how booking works, gallery (illustrations until real photos), amenities (from package inclusions only), testimonials (DB; hidden while empty), location + Google Maps, FAQs, footer.
- Booking engine: experience → package → session → calendar (available / full / unavailable) → slot hold → details/OTP → consent → payment; coupons, special requests, advance or full payment, tax.
- Resource engine: hours, buffers, closures, shared assets, 15-min holds, statuses Pending Payment → Confirmed → Checked In → In Progress → Completed / Cancelled / Refund Pending / Refunded / No Show.
- Payments: Razorpay order + signature verify + webhook with idempotency; pay-at-venue when no keys. Never fakes success in production.
- Admin modules A–L with RBAC (5 roles), CSV exports, audit log. Rate limiting, RLS on every table.
- Notifications outbox (WhatsApp Cloud API templates, Resend email), cron for reminders/expiry/feedback/retention.
- Recordings: links delivered only through the guest's private booking token; revocable.
- PWA manifest + icons. Docs: DEPLOY.md, ADMIN-GUIDE.md, TEST-REPORT.md.

## Tested
See TEST-REPORT.md — 51 e2e tests pass; content checker passes.

## Remains / assumptions
- Real venue photos, testimonials and equipment list (sections hide or use illustrations until added; nothing invented).
- SMS OTP provider code (MSG91/Gupshup) once an account is chosen.
- Recording files are delivered as secure external links; direct file upload to Supabase Storage needs the service-role key.
- Staff auth is the app's own (scrypt + signed cookie), not Supabase Auth.

## Blockers — pending credentials / decisions from owner
1. Razorpay key id, key secret, webhook secret.
2. WhatsApp Cloud API token, phone number id, approved templates.
3. Resend API key + verified domain.
4. `CRON_SECRET` and an external 15-min cron for 2 h reminders.
5. SMS OTP provider.
6. Supabase service-role key (for file storage).
7. Custom domain.
8. Advocate approval of policy pack v2.0 and remaining legal fields; film licences before opening the Legal Gate.
