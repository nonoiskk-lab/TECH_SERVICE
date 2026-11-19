import Link from "next/link";
import { isLegalGateOpen } from "@/config/site";
import { bookablePackages, fromPrice } from "@/config/packages";
import { PriceList } from "@/components/price-list";
import { getDict } from "@/lib/locale";
import { faqItems } from "@/lib/faq";
import { formatINR } from "@/lib/pricing";
import { Container, Faq, Section, TwoTone } from "@/components/ui";
import { JsonLd, faqLd } from "@/components/json-ld";
import { CakeIcon, CameraIcon, MicIcon, ScreenIcon } from "@/components/icons";
import { flowEnv } from "@/lib/flow-env";

export default async function Home() {
  const { t, locale } = await getDict();
  const gateOpen = isLegalGateOpen();
  const { advancePercent } = flowEnv();
  const faqs = faqItems(t, locale, advancePercent);
  const steps = advancePercent > 0 ? t.home.steps : t.home.steps.map((s, i) => (i === 2 ? t.home.stepVenue : s));
  const from = formatINR(fromPrice(gateOpen));
  const cards = [
    { href: "/create", title: t.home.pickCreate, text: t.home.pickCreateText, soon: false, id: "create", Icon: MicIcon },
    { href: "/celebrate", title: t.home.pickCelebrate, text: t.home.pickCelebrateText, soon: false, id: "celebrate", Icon: CakeIcon },
    {
      href: "/watch",
      title: t.home.pickWatch,
      text: gateOpen ? t.home.pickWatchOpen : t.home.pickWatchClosed,
      soon: !gateOpen,
      id: "watch",
      Icon: ScreenIcon,
    },
  ];

  return (
    <>
      {/* Hero: two columns on desktop; text first on mobile. */}
      <div className="ts-hero-bg border-b border-line">
        <Container className="grid items-center gap-10 pb-14 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="flex flex-wrap items-center gap-3" data-testid="launch">
              <span className="ts-eyebrow">{t.home.launch}</span>
              <span className="rounded-full border border-gold px-2.5 py-0.5 text-xs font-semibold text-warm" data-testid="adults-only">
                {t.home.adultsOnly}
              </span>
            </p>
            <h1 className="mt-5 text-5xl leading-[1.02] sm:text-7xl">
              <TwoTone accent={t.home.heroAccent} rest={t.home.heroRest} />
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">{t.home.heroLine}</p>
            {!gateOpen && (
              <p className="ts-card ts-glow mt-6 inline-block px-4 py-3 text-sm font-semibold" data-testid="gate-banner">
                {t.home.gateClosedBanner}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className="ts-btn ts-btn-primary ts-btn-arrow">
                {t.home.heroCtaBook} · {t.common.from} {from}
              </Link>
              <Link href="/visit" className="ts-btn ts-btn-ghost ts-btn-arrow">
                {t.home.heroCtaVisit}
              </Link>
            </div>
          </div>
          {/* Decorative collage (no photos supplied yet). */}
          <div aria-hidden="true" className="relative mx-auto hidden h-[380px] w-full max-w-[460px] sm:block">
            <div className="absolute left-0 top-6 flex h-52 w-52 items-center justify-center rounded-full bg-white shadow-xl ring-8 ring-white">
              <MicIcon className="h-20 w-20 text-warm" />
            </div>
            <div className="absolute right-4 top-0 flex h-40 w-40 items-center justify-center rounded-full bg-gold shadow-xl ring-8 ring-white">
              <CameraIcon className="h-14 w-14 text-on-gold" />
            </div>
            <div className="absolute bottom-0 right-10 flex h-48 w-48 items-center justify-center rounded-full bg-[#1c1c1d] shadow-xl ring-8 ring-white">
              <CakeIcon className="h-16 w-16 text-[#e0bd84]" />
            </div>
            <div className="absolute bottom-16 left-24 rounded-full bg-white px-4 py-2 text-sm shadow-lg">
              {t.common.from} <strong className="font-heading text-warm">{from}</strong>
            </div>
          </div>
        </Container>
      </div>

      <Section eyebrow={t.home.eyebrowServices} accent={t.home.pickerAccent} title={t.home.pickerRest} id="picker" center>
        <div className="grid gap-5 sm:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.id} href={c.href} className="ts-card ts-glow group flex flex-col p-7 transition hover:-translate-y-0.5 hover:border-gold" data-testid={`pick-${c.id}`}>
              <span className="flex items-start justify-between gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-raised text-warm">
                  <c.Icon className="h-7 w-7" />
                </span>
                {c.soon && <span className="rounded-full border border-line px-2.5 py-1 text-xs text-faint">{t.common.comingSoon}</span>}
              </span>
              <span className="mt-5 font-heading text-2xl">{c.title}</span>
              <span className="mt-2 text-muted">{c.text}</span>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-warm">{t.common.learnMore} →</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section eyebrow={t.home.eyebrowPrices} accent={t.home.pricesAccent} title={t.home.pricesRest} id="prices" className="bg-white">
        <PriceList pkgs={bookablePackages(gateOpen)} t={t} locale={locale} />
      </Section>

      <Section eyebrow={t.home.eyebrowProcess} accent={t.home.stepsAccent} title={t.home.stepsRest} id="steps">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.t} className="ts-card ts-glow p-6">
              <span className="ts-eyebrow">
                {t.home.stepLabel} {i + 1}
              </span>
              <h3 className="mt-3 text-xl">{s.t}</h3>
              <p className="mt-2 text-sm text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <section id="stories" className="py-4">
        <Container>
          <div className="ts-dark rounded-[var(--ts-radius)] p-8 sm:p-12">
            <p className="ts-eyebrow">{t.home.eyebrowStories}</p>
            <h2 className="mt-3 text-3xl sm:text-5xl">
              <TwoTone accent={t.home.storiesTitle.split(" ")[0]} rest={t.home.storiesTitle.split(" ").slice(1).join(" ")} />
            </h2>
            <p className="mt-4 max-w-2xl text-muted">{t.home.storiesText}</p>
            <Link href="/create" className="ts-btn ts-btn-primary ts-btn-arrow mt-6">
              {t.home.pickCreate}
            </Link>
          </div>
        </Container>
      </section>

      <Section eyebrow={t.home.eyebrowFaq} accent={t.home.faqAccent} title={t.home.faqRest} id="faq">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <Faq items={faqs} />
          <div className="ts-card ts-glow h-fit p-7 lg:sticky lg:top-24">
            <p className="text-sm text-muted">{t.common.from}</p>
            <p className="font-heading text-5xl text-warm">{from}</p>
            <Link href="/book" className="ts-btn ts-btn-primary ts-btn-arrow mt-5 w-full">
              {t.nav.book}
            </Link>
          </div>
        </div>
      </Section>
      <JsonLd data={faqLd(faqs)} />
    </>
  );
}
