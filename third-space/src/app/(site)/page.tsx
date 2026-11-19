import Link from "next/link";
import { isLegalGateOpen, site } from "@/config/site";
import { fromPrice } from "@/config/packages";
import { getDict } from "@/lib/locale";
import { faqItems } from "@/lib/faq";
import { formatINR } from "@/lib/pricing";
import { Container, Faq, HowItWorks, Section } from "@/components/ui";
import { JsonLd, faqLd } from "@/components/json-ld";

export default async function Home() {
  const { t, locale } = await getDict();
  const gateOpen = isLegalGateOpen();
  const faqs = faqItems(t, locale);
  const cards = [
    {
      href: "/watch",
      title: t.home.pickWatch,
      text: gateOpen ? t.home.pickWatchOpen : t.home.pickWatchClosed,
      soon: !gateOpen,
      id: "watch",
    },
    { href: "/create", title: t.home.pickCreate, text: t.home.pickCreateText, soon: false, id: "create" },
    { href: "/celebrate", title: t.home.pickCelebrate, text: t.home.pickCelebrateText, soon: !gateOpen, id: "celebrate" },
  ];
  return (
    <>
      <div className="ts-hero-bg">
        <Container className="pb-14 pt-14 sm:pt-24">
          <p className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-warm" data-testid="launch">
            {t.home.launch}
            <span className="rounded-full border border-warm/60 px-2 py-0.5 tracking-widest" data-testid="adults-only">
              {t.home.adultsOnly}
            </span>
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-7xl">
            {site.tagline.split(" • ").map((w, i) => (
              <span key={w} className="block">
                {w}
                {i < 2 && <span aria-hidden="true" className="text-warm">.</span>}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">{t.home.heroLine}</p>
          {!gateOpen && (
            <p className="ts-card ts-glow mt-6 inline-block px-4 py-3 text-sm font-semibold" data-testid="gate-banner">
              {t.home.gateClosedBanner}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/book" className="ts-btn ts-btn-primary">
              {t.home.heroCtaBook} · {t.common.from} {formatINR(fromPrice(gateOpen))}
            </Link>
            <Link href="/visit" className="ts-btn ts-btn-ghost">
              {t.home.heroCtaVisit}
            </Link>
          </div>
        </Container>
      </div>

      <Section title={t.home.pickerTitle} id="picker">
        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.id} href={c.href} className="ts-card group flex flex-col p-6 hover:border-warm" data-testid={`pick-${c.id}`}>
              <span className="flex items-center justify-between">
                <span className="font-heading text-2xl font-extrabold">{c.title}</span>
                {c.soon && <span className="rounded-full border border-line px-2 py-1 text-xs text-faint">{t.common.comingSoon}</span>}
              </span>
              <span className="mt-3 text-muted">{c.text}</span>
              <span className="mt-6 text-sm font-semibold text-warm">{t.common.learnMore} →</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title={t.home.stepsTitle} id="steps">
        <HowItWorks t={t} />
      </Section>

      <Section id="stories">
        <div className="ts-card ts-glow p-6 sm:p-10">
          <h2 className="text-2xl font-bold">{t.home.storiesTitle}</h2>
          <p className="mt-3 max-w-2xl text-muted">{t.home.storiesText}</p>
          <Link href="/create" className="mt-5 inline-flex min-h-11 items-center font-semibold text-warm">
            {t.home.pickCreate} →
          </Link>
        </div>
      </Section>

      <Section id="faq">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <Faq items={faqs} title={t.home.faqTitle} />
          <div className="ts-card h-fit p-6 lg:sticky lg:top-24">
            <p className="text-sm text-muted">{t.common.from}</p>
            <p className="font-heading text-4xl font-extrabold text-warm">{formatINR(fromPrice(gateOpen))}</p>
            <Link href="/book" className="ts-btn ts-btn-primary mt-4 w-full">
              {t.nav.book}
            </Link>
          </div>
        </div>
      </Section>
      <JsonLd data={faqLd(faqs)} />
    </>
  );
}
