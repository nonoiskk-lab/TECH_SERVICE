import type { Metadata } from "next";
import Link from "next/link";
import { addOns, isLegalGateOpen, sessionRules, booking } from "@/config/site";
import { bookablePackages } from "@/config/packages";
import { getDict } from "@/lib/locale";
import { tl } from "@/i18n";
import { flowEnv } from "@/lib/flow-env";
import { formatINR } from "@/lib/pricing";
import { durationText, hourlyRate, priceLabel } from "@/lib/session";
import { ensureCatalog } from "@/server/catalog";
import { PackageCard, PageHeader, Section } from "@/components/ui";
import { PriceList } from "@/components/price-list";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.pricing.metaTitle, description: t.pricing.metaDescription, alternates: { canonical: "/pricing" } };
}

/** Every price shown here comes from the admin-edited catalogue; nothing is hard-coded on the page. */
export default async function PricingPage() {
  await ensureCatalog();
  const { t, locale } = await getDict();
  const P = t.pricing;
  const gateOpen = isLegalGateOpen();
  const pkgs = bookablePackages(gateOpen).filter((p) => p.mode !== "visit");
  const { advancePercent } = flowEnv();
  const groups = (["watch", "celebrate", "create"] as const)
    .map((mode) => ({ mode, title: mode === "watch" ? P.groups.theatre : mode === "celebrate" ? P.groups.celebration : P.groups.podcast, items: pkgs.filter((p) => p.mode === mode) }))
    .filter((g) => g.items.length > 0);
  const extras = addOns.filter((a) => a.modes.some((m) => pkgs.some((p) => p.mode === m)));
  return (
    <>
      <PageHeader title={P.title} intro={P.intro} />
      {groups.map((g, i) => (
        <Section key={g.mode} title={g.title} id={`group-${g.mode}`} className={i % 2 === 1 ? "ts-band-light" : ""}>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {g.items.map((p) => (
              <PackageCard key={p.id} pkg={p} t={t} locale={locale} bookable bookHref={`/book?package=${p.id}`} />
            ))}
          </div>
        </Section>
      ))}

      <Section title={P.compareTitle} id="compare">
        <div className="ts-card overflow-x-auto" data-testid="compare-table">
          <table className="ts-table min-w-[720px]">
            <thead>
              <tr>
                <th scope="col">{P.colPackage}</th>
                <th scope="col">{P.colSpace}</th>
                <th scope="col">{P.colTime}</th>
                <th scope="col">{P.colGuests}</th>
                <th scope="col">{P.colPrice}</th>
                <th scope="col">{P.colRate}</th>
                <th scope="col">{P.colIncludes}</th>
              </tr>
            </thead>
            <tbody>
              {pkgs.map((p) => {
                const rate = hourlyRate(p);
                return (
                  <tr key={p.id} data-testid={`compare-${p.id}`}>
                    <th scope="row" className="font-semibold">
                      <Link href={`/book?package=${p.id}`} className="hover:text-warm">
                        {tl(p.name, locale)}
                      </Link>
                    </th>
                    <td>{p.mode === "create" ? P.spaceStudio : P.spaceRoom}</td>
                    <td>{p.pricing.kind === "fixed" ? durationText(p.durationMinutes) : t.book.timeAuto}</td>
                    <td>{p.capacity}</td>
                    <td className="font-semibold text-warm">{priceLabel(p, formatINR, t.common.free)}</td>
                    <td>{rate ? `${formatINR(rate)}${t.common.perHour}` : "—"}</td>
                    <td className="text-muted">{p.includes.map((x) => tl(x, locale)).join(" · ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {extras.length > 0 && (
        <Section title={P.addOnsTitle} id="addons" className="ts-band-light">
          <div className="ts-card overflow-x-auto">
            <table className="ts-table">
              <thead>
                <tr>
                  <th scope="col">{P.addOnName}</th>
                  <th scope="col">{P.addOnPrice}</th>
                </tr>
              </thead>
              <tbody>
                {extras.map((a) => (
                  <tr key={a.id}>
                    <td>{tl(a.name, locale)}</td>
                    <td className="font-semibold">{formatINR(a.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section title={P.notesTitle} id="notes">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <ul className="ts-card space-y-3 p-6 text-muted" data-testid="pricing-notes">
            <li>{P.noteTax.replace("{pct}", String(booking.taxPercent))}</li>
            <li>{P.noteMin.replace("{min}", formatINR(sessionRules.minimumCharge))}</li>
            <li>{advancePercent > 0 ? P.noteAdvance.replace("{pct}", String(advancePercent)) : P.noteVenue}</li>
            <li>{P.noteSetup}</li>
            <li>
              <Link href="/cancellation-refund" className="ts-btn ts-btn-text">
                {P.refundLink} →
              </Link>
            </li>
          </ul>
          <PriceList pkgs={pkgs} t={t} locale={locale} />
        </div>
      </Section>
    </>
  );
}
