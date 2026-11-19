import Link from "next/link";
import type { Dict } from "@/i18n";
import { telHref, type PublicBusiness } from "@/lib/business";
import { Wordmark } from "./site-header";

export function SiteFooter({ t, biz, gateOpen }: { t: Dict; biz: PublicBusiness; gateOpen: boolean }) {
  const tel = telHref(biz.phone);
  return (
    <footer className="mt-16 border-t border-line bg-raised pb-28 sm:pb-10" data-testid="site-footer">
      <div className="mx-auto grid max-w-[var(--ts-maxw)] gap-8 px-4 py-10 sm:grid-cols-3">
        <div className="space-y-3">
          <Wordmark />
          <p className="text-sm text-muted">{t.footer.about}</p>
          <address className="space-y-1 text-sm not-italic text-muted">
            <div>
              <span className="text-faint">{t.common.address}: </span>
              <span data-consistency="address">{biz.address}</span>
            </div>
            <div>
              <span className="text-faint">{t.common.hours_label}: </span>
              <span data-consistency="hours">{biz.hoursLabel}</span>
            </div>
            {tel && (
              <div>
                <span className="text-faint">{t.common.call}: </span>
                <a href={tel} className="underline-offset-4 hover:underline" data-consistency="phone">
                  {biz.phone}
                </a>
              </div>
            )}
            {biz.email && (
              <div>
                <span className="text-faint">{t.common.email}: </span>
                <a href={`mailto:${biz.email}`} className="underline-offset-4 hover:underline" data-consistency="email">
                  {biz.email}
                </a>
              </div>
            )}
          </address>
        </div>
        <nav aria-label={t.footer.explore} className="text-sm">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-faint">{t.footer.explore}</h2>
          <ul className="space-y-1">
            {[
              ["/watch", t.nav.watch],
              ["/create", t.nav.create],
              ["/celebrate", t.nav.celebrate],
              ["/visit", t.nav.visit],
              ["/book", t.nav.book],
              ["/policies", t.nav.policies],
              ["/contact", t.nav.contact],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="inline-flex min-h-11 items-center text-muted hover:text-text">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t.footer.local} className="text-sm">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-faint">{t.footer.local}</h2>
          <ul className="space-y-1">
            <li>
              <Link href="/podcast-studio-in-dhanbad" className="inline-flex min-h-11 items-center text-muted hover:text-text">
                {t.seo.podcastTitle}
              </Link>
            </li>
            {gateOpen && (
              <li>
                <Link href="/private-theatre-in-dhanbad" className="inline-flex min-h-11 items-center text-muted hover:text-text">
                  {t.seo.theatreTitle}
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
      <p className="mx-auto max-w-[var(--ts-maxw)] px-4 text-xs text-faint">© 2026 {t.footer.rights}</p>
    </footer>
  );
}
