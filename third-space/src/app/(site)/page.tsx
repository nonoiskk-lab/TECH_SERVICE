import Link from "next/link";
import { isLegalGateOpen } from "@/config/site";
import { bookablePackages, fromPrice } from "@/config/packages";
import { PriceList } from "@/components/price-list";
import { getDict } from "@/lib/locale";
import { faqItems } from "@/lib/faq";
import { formatINR } from "@/lib/pricing";
import { tl } from "@/i18n";
import { Container, Faq, PackageCard, Section, TwoTone } from "@/components/ui";
import { JsonLd, faqLd } from "@/components/json-ld";
import { CakeIcon, CalendarIcon, CameraIcon, ClockIcon, LockIcon, MicIcon, ScreenIcon, ShieldIcon, UserIcon, WalletIcon } from "@/components/icons";
import { CelebrationScene, CreatorScene, PodcastScene, RoomScene } from "@/components/illustrations";
import { flowEnv } from "@/lib/flow-env";
import { publicBusiness } from "@/lib/business";
import { ensureCatalog } from "@/server/catalog";
import { galleryImages, testimonials } from "@/server/content";
import { GalleryGrid, MapEmbed, Testimonials } from "@/components/site-sections";

/**
 * Home. Section order follows docs/audit DOCUMENT 10 (hero → trust → experiences →
 * packages → features → steps → statement band → prices → gallery → proof → visit → location → FAQ).
 */
export default async function Home() {
  await ensureCatalog();
  const { t, locale } = await getDict();
  const h = t.home2;
  const gateOpen = isLegalGateOpen();
  const { advancePercent } = flowEnv();
  const faqs = faqItems(t, locale, advancePercent);
  const steps = advancePercent > 0 ? t.home.steps : t.home.steps.map((s, i) => (i === 2 ? t.home.stepVenue : s));
  const from = formatINR(fromPrice(gateOpen));
  const biz = publicBusiness(locale);
  const bookable = bookablePackages(gateOpen);
  const popular = ["theatre-classic", "podcast", "creator-shoot", "celebration", "creator-plan"]
    .map((id) => bookable.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 3);
  const [photos, reviews] = await Promise.all([galleryImages(6), testimonials(6)]);

  const experiences = [
    { ...h.exp[0], href: "/private-theatre", id: "watch", Icon: ScreenIcon, Art: RoomScene, soon: !gateOpen, text: gateOpen ? h.exp[0].text : t.home.pickWatchClosed },
    { ...h.exp[1], href: "/podcast-studio", id: "create", Icon: MicIcon, Art: PodcastScene, soon: false, text: h.exp[1].text },
    { ...h.exp[2], href: "/creative-studio", id: "creative", Icon: CameraIcon, Art: CreatorScene, soon: false, text: h.exp[2].text },
  ];
  const featIcons = [CalendarIcon, LockIcon, ClockIcon, UserIcon, WalletIcon, ShieldIcon];
  const feats = h.feats.map((f) => ({ ...f, d: f.d.replace("{payments}", advancePercent > 0 ? h.payOnline : h.payVenue) }));

  return (
    <>
      {/* 1. Hero: headline + value line + two CTAs + helper facts; illustration collage on the right. */}
      <div className="ts-hero-bg border-b border-line">
        <Container className="grid items-center gap-10 pb-16 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:pb-24">
          <div>
            <p className="flex flex-wrap items-center gap-3" data-testid="launch">
              <span className="ts-eyebrow">{t.home.launch}</span>
              <span className="rounded-md border border-gold px-2.5 py-0.5 text-xs font-semibold text-warm" data-testid="adults-only">
                {t.home.adultsOnly}
              </span>
            </p>
            <h1 className="mt-5 text-5xl leading-[1.02] sm:text-7xl">
              <TwoTone accent={t.home.heroAccent} rest={t.home.heroRest} />
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">{t.home.heroLine}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.25em] text-faint" data-testid="endorsement">
              {t.pages.endorsement}
            </p>
            {!gateOpen && (
              <p className="ts-card ts-glow mt-6 inline-block px-4 py-3 text-sm font-semibold" data-testid="gate-banner">
                {t.home.gateClosedBanner}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className="ts-btn ts-btn-primary ts-btn-lg ts-btn-arrow" data-testid="hero-book">
                {t.home.heroCtaBook} · {t.common.from} {from}
              </Link>
              <Link href="/visit" className="ts-btn ts-btn-ghost ts-btn-lg">
                {h.ctaVisit}
              </Link>
            </div>
            <p className="mt-4 text-sm text-faint">{h.helper}</p>
          </div>
          <div aria-hidden="true" className="relative mx-auto h-[300px] w-full max-w-[460px] sm:h-[400px]">
            <div className="absolute left-0 top-4 h-48 w-48 overflow-hidden rounded-full shadow-xl ring-8 ring-[var(--ts-bg)] sm:h-60 sm:w-60">
              <RoomScene className="h-full w-full" />
            </div>
            <div className="absolute right-0 top-0 h-36 w-36 overflow-hidden rounded-full shadow-xl ring-8 ring-[var(--ts-bg)] sm:h-44 sm:w-44">
              <PodcastScene className="h-full w-full" />
            </div>
            <div className="absolute bottom-0 right-6 h-44 w-44 overflow-hidden rounded-full shadow-xl ring-8 ring-[var(--ts-bg)] sm:h-56 sm:w-56">
              <CreatorScene className="h-full w-full" />
            </div>
            <div className="absolute bottom-6 left-6 rounded-xl bg-card px-4 py-2 text-sm shadow-lg">
              {t.common.from} <strong className="font-heading text-warm">{from}</strong>
            </div>
          </div>
        </Container>
      </div>

      {/* 2. Trust strip: factual promises only (no invented ratings or logos). */}
      <div className="border-b border-line bg-card">
        <Container>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3 py-6 text-sm text-muted lg:grid-cols-4" data-testid="trust-strip">
            {h.trust.map((x) => (
              <li key={x} className="flex items-center gap-2">
                <span aria-hidden="true" className="text-warm">
                  ✦
                </span>
                {x}
              </li>
            ))}
          </ul>
        </Container>
      </div>

      {/* 3. Three experiences. */}
      <Section eyebrow={h.eyebrow} title={h.expTitle} intro={h.expIntro} id="picker" center>
        <div className="grid gap-5 md:grid-cols-3">
          {experiences.map((c) => (
            <Link key={c.id} href={c.href} className="ts-card ts-card-hover ts-reveal group flex flex-col overflow-hidden" data-testid={`pick-${c.id}`}>
              <span className="block aspect-[4/3] overflow-hidden" aria-hidden="true">
                <c.Art className="h-full w-full transition duration-500 group-hover:scale-105" />
              </span>
              <span className="flex flex-1 flex-col p-7">
                <span className="flex items-start justify-between gap-3">
                  <span className="ts-num">{c.n}</span>
                  {c.soon && <span className="rounded-md border border-line px-2.5 py-1 text-xs text-faint">{t.common.comingSoon}</span>}
                </span>
                <span className="mt-4 flex items-center gap-3">
                  <span className="ts-icon">
                    <c.Icon className="h-6 w-6" />
                  </span>
                  <span className="font-heading text-2xl">{c.title}</span>
                </span>
                <span className="mt-3 text-muted">{c.text}</span>
                <span className="mt-auto pt-6 text-sm font-semibold text-warm">{t.common.learnMore} →</span>
              </span>
            </Link>
          ))}
        </div>
        <Link href="/celebrations" className="ts-card ts-card-hover mt-5 flex items-center gap-4 p-5" data-testid="pick-celebrate">
          <span className="ts-icon">
            <CakeIcon className="h-6 w-6" />
          </span>
          <span className="flex-1">
            <span className="block font-heading text-xl">{h.celebrateTitle}</span>
            <span className="block text-sm text-muted">{h.celebrateText}</span>
          </span>
          <span className="text-warm" aria-hidden="true">
            →
          </span>
        </Link>
      </Section>

      {/* 4. Popular packages. */}
      {popular.length > 0 && (
        <Section title={t.pages.popularTitle} id="popular" className="ts-band-light">
          <div className="grid gap-5 md:grid-cols-3">
            {popular.map((p) => (
              <PackageCard key={p.id} pkg={p} t={t} locale={locale} bookable bookHref={`/book?package=${p.id}`} />
            ))}
          </div>
          <Link href="/pricing" className="ts-btn ts-btn-ghost mt-8">
            {h.pricingCta}
          </Link>
        </Section>
      )}

      {/* 5. Feature grid: what the booking system does for the guest. */}
      <Section title={h.featTitle} intro={h.featIntro} id="features" center>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="features">
          {feats.map((f, i) => {
            const Icon = featIcons[i];
            return (
              <div key={f.t} className="ts-card ts-reveal flex gap-4 p-6">
                <span className="ts-icon">
                  <Icon className="h-6 w-6" />
                </span>
                <span>
                  <h3 className="text-xl">{f.t}</h3>
                  <p className="mt-1 text-sm text-muted">{f.d}</p>
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 6. How booking works. */}
      <Section eyebrow={t.home.eyebrowProcess} accent={t.home.stepsAccent} title={t.home.stepsRest} id="steps" className="bg-card">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.t} className="ts-card ts-reveal p-6">
              <span className="ts-num">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 text-xl">{s.t}</h3>
              <p className="mt-2 text-sm text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 7. Statement band (facts from config). */}
      <section className="ts-band-gold ts-section" data-testid="statement-band">
        <Container className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-heading text-4xl sm:text-6xl">{h.bandFrom.replace("{price}", from)}</p>
            <p className="mt-3 max-w-2xl text-lg text-muted">{h.bandLine}</p>
          </div>
          <Link href="/book" className="ts-btn ts-btn-primary ts-btn-lg">
            {t.nav.book}
          </Link>
        </Container>
      </section>

      {/* 8. Price list (all bookable packages). */}
      <Section eyebrow={t.home.eyebrowPrices} accent={t.home.pricesAccent} title={t.home.pricesRest} id="prices">
        <PriceList pkgs={bookable} t={t} locale={locale} />
      </Section>

      {/* 9. Gallery. */}
      <Section title={t.pages.galleryHome} id="gallery" className="ts-band-light">
        <GalleryGrid images={photos} t={t} limit={6} />
        <Link href="/gallery" className="ts-btn ts-btn-text mt-5">
          {t.nav.gallery} →
        </Link>
      </Section>

      {/* 10. Social proof: only real testimonials entered by staff. */}
      {reviews.length > 0 && (
        <Section title={t.pages.testimonialsTitle} id="testimonials">
          <Testimonials items={reviews} />
        </Section>
      )}

      {/* 11. "See it first" split CTA. */}
      <section className="ts-section" id="visit">
        <Container>
          <div className="ts-card grid overflow-hidden md:grid-cols-2">
            <div aria-hidden="true" className="aspect-[4/3] md:aspect-auto">
              <CelebrationScene className="h-full w-full" />
            </div>
            <div className="flex flex-col justify-center gap-4 p-8 sm:p-12">
              <h2 className="text-3xl sm:text-5xl">{h.visitTitle}</h2>
              <p className="text-muted">{h.visitText}</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/visit" className="ts-btn ts-btn-primary ts-btn-lg">
                  {h.ctaVisit}
                </Link>
                <Link href="/contact" className="ts-btn ts-btn-ghost ts-btn-lg">
                  {t.nav.contact}
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 12. Location. */}
      <Section title={t.pages.locationTitle} id="location" className="bg-card">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="ts-card space-y-3 p-6">
            <p className="text-muted">
              {t.common.address}: <span data-consistency="address">{biz.address}</span>
            </p>
            <p className="text-muted">
              {t.common.hours_label}: <span data-consistency="hours">{biz.hoursLabel}</span>
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <a href={biz.mapUrl} target="_blank" rel="noopener noreferrer" className="ts-btn ts-btn-ghost">
                {t.common.openMap}
              </a>
              <Link href="/contact" className="ts-btn ts-btn-ghost">
                {t.nav.contact}
              </Link>
            </div>
          </div>
          <MapEmbed address={biz.address} title={t.pages.locationTitle} />
        </div>
      </Section>

      {/* 13. FAQ accordion + sticky price card. */}
      <Section eyebrow={t.home.eyebrowFaq} accent={t.home.faqAccent} title={t.home.faqRest} id="faq">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <Faq items={faqs} />
          <div className="ts-card ts-glow h-fit p-7 lg:sticky lg:top-24">
            <p className="text-sm text-muted">{t.common.from}</p>
            <p className="font-heading text-5xl text-warm">{from}</p>
            <p className="mt-2 text-sm text-faint">{tl({ en: "Before GST. Exact price shown before you pay.", hi: "GST se pehle. Payment se pehle exact price dikhega." }, locale)}</p>
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
