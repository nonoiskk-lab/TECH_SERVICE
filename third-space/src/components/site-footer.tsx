import Link from "next/link";
import type { Dict } from "@/i18n";
import { telHref, type PublicBusiness } from "@/lib/business";
import { Wordmark } from "./site-header";

const linkCls = "inline-flex min-h-9 items-center text-[15px] text-muted transition-colors hover:text-warm";

/** White four-column footer: brand, explore, policies & guides, contact; legal row below. */
export function SiteFooter({ t, biz, gateOpen }: { t: Dict; biz: PublicBusiness; gateOpen: boolean }) {
  const tel = telHref(biz.phone);
  const explore: [string, string][] = [
    ["/private-theatre", t.nav.watch],
    ["/podcast-studio", t.nav.create],
    ["/creative-studio", t.nav.creative],
    ["/celebrations", t.nav.celebrate],
    ["/pricing", t.nav.pricing],
    ["/creator-plans", t.nav.plans],
    ["/gallery", t.nav.gallery],
    ["/visit", t.nav.visit],
    ["/book", t.nav.book],
  ];
  const guides: [string, string][] = [
    ["/my-booking", t.nav.myBooking],
    ["/account", t.nav.account],
    ["/about", t.nav.about],
    ["/faqs", t.nav.faqs],
    ["/policies", t.nav.policies],
    ["/podcast-studio-in-dhanbad", t.seo.podcastTitle],
    ...(gateOpen ? ([["/private-theatre-in-dhanbad", t.seo.theatreTitle]] as [string, string][]) : []),
  ];
  return (
    <footer className="mt-0 border-t border-line bg-card pb-28 sm:pb-10" data-testid="site-footer">
      <div className="mx-auto grid max-w-[var(--ts-maxw)] gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div className="space-y-3">
          <Wordmark />
          <p className="max-w-xs text-[15px] text-muted">{t.footer.about}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-faint">{t.pages.endorsement}</p>
        </div>
        <nav aria-label={t.footer.explore}>
          <h2 className="mb-3 font-sans text-base font-bold">{t.footer.explore}</h2>
          <ul>
            {explore.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={linkCls}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t.footer.local}>
          <h2 className="mb-3 font-sans text-base font-bold">{t.footer.local}</h2>
          <ul>
            {guides.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={linkCls}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="mb-3 font-sans text-base font-bold">{t.nav.contact}</h2>
          <address className="space-y-2 text-[15px] not-italic text-muted">
            <p>
              <span className="sr-only">{t.common.address}: </span>
              <span data-consistency="address">{biz.address}</span>
            </p>
            <p>
              <span className="text-faint">{t.common.hours_label}: </span>
              <span data-consistency="hours">{biz.hoursLabel}</span>
            </p>
            {tel && (
              <p>
                <span className="text-faint">{t.common.call}: </span>
                <a href={tel} className="text-warm hover:underline" data-consistency="phone">
                  {biz.phone}
                </a>
              </p>
            )}
            {biz.email && (
              <p>
                <span className="text-faint">{t.common.email}: </span>
                <a href={`mailto:${biz.email}`} className="break-all text-warm hover:underline" data-consistency="email">
                  {biz.email}
                </a>
              </p>
            )}
            <p>
              <Link href="/contact" className="ts-btn ts-btn-ghost mt-2">
                {t.nav.contact}
              </Link>
            </p>
          </address>
        </div>
      </div>
      <div className="mx-auto flex max-w-[var(--ts-maxw)] flex-wrap items-center justify-between gap-3 border-t border-line px-4 pt-6 text-xs text-faint">
        <span>
          © 2026 {t.footer.rights} · {t.pages.endorsement}
        </span>
        <span className="flex flex-wrap gap-4">
          <Link href="/terms" className="hover:text-warm">
            {t.nav.terms}
          </Link>
          <Link href="/privacy" className="hover:text-warm">
            {t.nav.privacy}
          </Link>
          <Link href="/cancellation-refund" className="hover:text-warm">
            {t.nav.refunds}
          </Link>
        </span>
      </div>
    </footer>
  );
}
