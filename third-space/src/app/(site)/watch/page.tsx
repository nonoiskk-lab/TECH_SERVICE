import type { Metadata } from "next";
import Link from "next/link";
import { addOnsFor, contentRule, isLegalGateOpen, themes } from "@/config/site";
import { packages } from "@/config/packages";
import { getDict } from "@/lib/locale";
import { tl } from "@/i18n";
import { formatINR } from "@/lib/pricing";
import { PackageCard, PageHeader, Section } from "@/components/ui";
import { TrackOnView } from "@/components/client-bits";
import { activeTitles } from "@/server/titles";
import { durationText, resolveSession } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  const open = isLegalGateOpen();
  return {
    title: open ? t.watch.metaTitle : t.watch.metaTitleClosed,
    description: open ? t.watch.metaDescription : t.watch.metaDescriptionClosed,
    alternates: { canonical: "/watch" },
    robots: open ? undefined : { index: false, follow: true },
  };
}

export default async function WatchPage() {
  const { t, locale } = await getDict();
  const open = isLegalGateOpen();

  if (!open) {
    // Gate closed: no package names, no screening copy. Only "coming soon".
    return (
      <>
        <PageHeader title={t.watch.closedTitle} intro={t.watch.closedText} eyebrow={t.common.comingSoon} />
        <Section>
          <div className="ts-card flex flex-col gap-3 p-6 sm:flex-row" data-testid="watch-closed">
            <Link href="/create" className="ts-btn ts-btn-primary">
              {t.watch.closedCta}
            </Link>
            <Link href="/contact?purpose=other" className="ts-btn ts-btn-ghost">
              {t.watch.closedNotify}
            </Link>
          </div>
        </Section>
      </>
    );
  }

  const watchPkgs = packages.filter((p) => p.mode === "watch");
  const titles = await activeTitles();
  return (
    <>
      <PageHeader title={t.watch.title} intro={t.watch.intro} />
      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          {watchPkgs.map((p) => (
            <PackageCard key={p.id} pkg={p} t={t} locale={locale} bookable bookHref={`/book?package=${p.id}`} />
          ))}
        </div>
        <TrackOnView event="view_package" props={{ page: "watch" }} />
      </Section>
      <Section title={t.watch.nowShowing} id="titles">
        {titles.length === 0 ? (
          <p className="ts-card p-5 text-muted" data-testid="no-titles">
            {t.book.noTitles}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2" data-testid="title-list">
            {titles.map((ti) => {
              const quotes = watchPkgs.map((p) => ({ p, r: resolveSession(p, { titleId: ti.id }, titles) }));
              const first = quotes.find((q) => q.r.ok)?.r;
              return (
                <li key={ti.id} className="ts-card p-5">
                  <h3 className="font-bold">{ti.name}</h3>
                  <p className="text-sm text-faint">
                    {durationText(ti.runtimeMinutes)}
                    {ti.language ? ` · ${ti.language}` : ""}
                    {first?.ok ? ` · ${t.book.sessionTime}: ${durationText(first.session.durationMinutes)}` : ""}
                  </p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {quotes.map(({ p, r }) =>
                      r.ok ? (
                        <li key={p.id} className="flex justify-between gap-3">
                          <span>{tl(p.name, locale)}</span>
                          <a href={`/book?package=${p.id}`} className="font-semibold text-warm" data-testid={`title-price-${p.id}`}>
                            {formatINR(r.session.basePrice)}
                          </a>
                        </li>
                      ) : null,
                    )}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
      <Section title={t.watch.themesTitle} id="themes">
        <div className="grid gap-3 sm:grid-cols-3">
          {themes.map((th) => (
            <div key={th.id} className="ts-card p-5">
              <h3 className="font-bold">{tl(th.name, locale)}</h3>
              <p className="mt-1 text-sm text-muted">{tl(th.description, locale)}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title={t.watch.addOnsTitle} id="addons">
        <ul className="grid gap-2 sm:grid-cols-2">
          {addOnsFor("watch").map((a) => (
            <li key={a.id} className="ts-card flex justify-between px-4 py-3">
              <span>{tl(a.name, locale)}</span>
              <span className="font-semibold text-warm">+{formatINR(a.price)}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title={t.watch.ruleTitle} id="rule">
        <p className="ts-card p-5 text-muted" data-testid="content-rule">
          {tl(contentRule, locale)}
        </p>
      </Section>
    </>
  );
}
