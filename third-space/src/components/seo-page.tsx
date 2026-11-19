import Link from "next/link";
import type { Dict } from "@/i18n";
import { tl } from "@/i18n";
import type { Locale, Package } from "@/config/site";
import { formatINR } from "@/lib/pricing";
import { hourlyRate } from "@/lib/session";
import { Container, Faq, HowItWorks, PageHeader, Section, durationLabel } from "./ui";
import { JsonLd, faqLd } from "./json-ld";

export function SeoPage({
  t,
  locale,
  title,
  intro,
  copy,
  pkgs,
  ctaHref,
  hoursLabel,
}: {
  t: Dict;
  locale: Locale;
  title: string;
  intro: string;
  copy: { sections: { h: string; p: string[] }[]; faq: { q: string; a: string }[] };
  pkgs: Package[];
  ctaHref: string;
  hoursLabel: string;
}) {
  return (
    <>
      <PageHeader title={title} intro={intro} />
      <Section>
        <div className="ts-card overflow-x-auto p-5">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="text-faint">
              <tr>
                <th className="py-2 pr-4 font-semibold">{t.book.stepPackage}</th>
                <th className="py-2 pr-4 font-semibold">{t.common.hours}</th>
                <th className="py-2 pr-4 font-semibold">{t.common.guests}</th>
                <th className="py-2 font-semibold">₹</th>
              </tr>
            </thead>
            <tbody>
              {pkgs.map((p) => (
                <tr key={p.id} className="border-t border-line/60">
                  <td className="py-2 pr-4">{tl(p.name, locale)}</td>
                  <td className="py-2 pr-4">{p.pricing.kind === "fixed" ? durationLabel(p.durationMinutes, t) : t.book.timeAuto}</td>
                  <td className="py-2 pr-4">
                    {t.common.upTo} {p.capacity}
                  </td>
                  <td className="py-2 font-semibold text-warm">{hourlyRate(p) ? `${formatINR(hourlyRate(p)!)}${t.common.perHour}` : formatINR(p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm text-faint">
            {t.common.hours_label}: <span data-consistency="hours">{hoursLabel}</span>
          </p>
        </div>
      </Section>
      {copy.sections.map((s) => (
        <Section key={s.h} title={s.h}>
          <div className="ts-prose max-w-3xl text-muted">
            {s.p.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </Section>
      ))}
      <Section title={t.home.stepsTitle}>
        <HowItWorks t={t} />
      </Section>
      <Section>
        <Faq items={copy.faq} title={t.home.faqTitle} />
        <JsonLd data={faqLd(copy.faq)} />
      </Section>
      <Container>
        <Link href={ctaHref} className="ts-btn ts-btn-primary">
          {t.nav.book}
        </Link>
      </Container>
    </>
  );
}
