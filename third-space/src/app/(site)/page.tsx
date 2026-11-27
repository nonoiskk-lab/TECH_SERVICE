import Link from "next/link";
import { enquiryPurposes, isLegalGateOpen } from "@/config/site";
import { bookablePackages, fromPrice } from "@/config/packages";
import { PriceList } from "@/components/price-list";
import { getDict } from "@/lib/locale";
import { faqItems } from "@/lib/faq";
import { formatINR } from "@/lib/pricing";
import { tl } from "@/i18n";
import { Container, Faq, PackageCard, Section, Sparkle } from "@/components/ui";
import { JsonLd, faqLd } from "@/components/json-ld";
import { CakeIcon, CalendarIcon, CameraIcon, ClockIcon, LockIcon, MicIcon, ScreenIcon, ShieldIcon, UserIcon, WalletIcon } from "@/components/icons";
import { CelebrationScene, CreatorScene, PodcastScene, RoomScene } from "@/components/illustrations";
import { flowEnv } from "@/lib/flow-env";
import { publicBusiness } from "@/lib/business";
import { ensureCatalog } from "@/server/catalog";
import { galleryImages, testimonials } from "@/server/content";
import { GalleryGrid, MapEmbed, Testimonials } from "@/components/site-sections";
import { EnquiryForm } from "@/components/enquiry-form";

/**
 * Home, laid out on the reference structure (docs/audit DOCUMENT 03 → 10):
 * split hero → trust row → proof → dark/light split feature rows → dark feature-card band →
 * packages → steps → gold statement band → prices → gallery → "see it first" split form → location → open FAQ.
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
  const featIcons = [CalendarIcon, LockIcon, ClockIcon, UserIcon, WalletIcon, ShieldIcon];
  const feats = h.feats.map((f) => ({ ...f, d: f.d.replace("{payments}", advancePercent > 0 ? h.payOnline : h.payVenue) }));
  const purposes = enquiryPurposes.filter((p) => !p.gated || gateOpen).map((p) => ({ id: p.id, label: tl(p.label, locale) }));

  return (
    <>
      {/* 1. Hero: heavy serif headline, value line, filled + outlined CTA pair, helper facts; framed illustration right. */}
      <section className="relative overflow-hidden bg-bg">
        <Container className="grid items-center gap-12 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
          <div>
            <p className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center" data-testid="launch">
              <span className="ts-eyebrow">{t.home.launch}</span>
              <span className="rounded-md border border-gold px-2 py-0.5 text-xs font-bold text-warm" data-testid="adults-only">
                {t.home.adultsOnly}
              </span>
            </p>
            {/* min-h reserves the two lines the display font needs on phones, so the headline does not push the page down when the font swaps in (CLS). */}
            <h1 className="mt-5 min-h-[5rem] sm:min-h-0 sm:text-[3.5rem] sm:leading-[1.1] lg:text-[4.25rem]">
              {t.home.heroAccent} <span className="ts-mark">{t.home.heroRest}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-[1.7] text-text sm:text-xl">{t.home.heroLine}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-faint" data-testid="endorsement">
              {t.pages.endorsement}
            </p>
            {!gateOpen && (
              <p className="ts-card mt-6 inline-block px-4 py-3 text-sm font-medium" data-testid="gate-banner">
                {t.home.gateClosedBanner}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className="ts-btn ts-btn-primary ts-btn-lg" data-testid="hero-book">
                {t.home.heroCtaBook} · {t.common.from} {from}
              </Link>
              <Link href="/visit" className="ts-btn ts-btn-ghost ts-btn-lg">
                {h.ctaVisit}
              </Link>
            </div>
            <p className="mt-4 text-[13px] text-faint">{h.helper}</p>
          </div>
          <div aria-hidden="true" className="relative mx-auto w-full max-w-[520px]">
            <Sparkle className="absolute -top-2 right-10 z-10 h-14 w-14 text-gold" />
            <Sparkle className="absolute right-0 top-16 z-10 h-7 w-7 text-gold/70" />
            <div className="ts-blob aspect-[5/4] w-full">
              <RoomScene className="h-full w-full" />
            </div>
            <span className="absolute -bottom-3 left-6 h-4 w-4 rounded-full border-2 border-text bg-bg" />
          </div>
        </Container>
      </section>

      {/* 2. Trust row (the reference's logo strip); factual promises only. */}
      <div className="border-y border-line bg-card">
        <Container>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-4 py-8 text-[15px] text-muted lg:grid-cols-4" data-testid="trust-strip">
            {h.trust.map((x, i) => {
              const Icon = [ShieldIcon, CalendarIcon, ClockIcon, UserIcon][i] ?? ShieldIcon;
              return (
                <li key={x} className="flex items-center gap-3">
                  <Icon className="h-6 w-6 shrink-0 text-warm" />
                  {x}
                </li>
              );
            })}
          </ul>
        </Container>
      </div>

      {/* 3. Social proof right after the hero, only when real reviews exist. */}
      {reviews.length > 0 && (
        <section className="ts-band-light ts-section" id="testimonials">
          <Container>
            <h2 className="mb-10 text-center text-3xl sm:text-[3.25rem]">{t.pages.testimonialsTitle}</h2>
            <Testimonials items={reviews} />
          </Container>
        </section>
      )}

      {/* 4. Experience rows: illustration + dark panel, alternating sides (the reference's split feature rows). */}
      <div id="picker">
        {[
          { id: "watch", n: h.exp[0].n, title: h.exp[0].title, text: gateOpen ? h.exp[0].text : t.home.pickWatchClosed, href: "/private-theatre", Art: RoomScene, Icon: ScreenIcon, soon: !gateOpen },
          { id: "create", n: h.exp[1].n, title: h.exp[1].title, text: h.exp[1].text, href: "/podcast-studio", Art: PodcastScene, Icon: MicIcon, soon: false },
          { id: "creative", n: h.exp[2].n, title: h.exp[2].title, text: h.exp[2].text, href: "/creative-studio", Art: CreatorScene, Icon: CameraIcon, soon: false },
        ].map((x, i) => (
          <section key={x.id} className="grid md:grid-cols-2" data-testid={`pick-${x.id}`}>
            <div aria-hidden="true" className={`min-h-[280px] overflow-hidden md:min-h-[460px] ${i % 2 === 1 ? "md:order-2" : ""}`}>
              <x.Art className="h-full w-full object-cover" />
            </div>
            <div className="ts-band-dark relative flex flex-col justify-center gap-5 px-6 py-14 sm:px-12 lg:px-20">
              <span className="ts-icon !bg-gold/15 !text-gold">
                <x.Icon className="h-7 w-7" />
              </span>
              <p className="ts-eyebrow !text-faint">
                Experience {x.n}
                {x.soon && <span className="ml-2 rounded-md border border-line px-2 py-0.5 normal-case tracking-normal">{t.common.comingSoon}</span>}
              </p>
              <h2 className="text-4xl leading-[1.1] sm:text-[3.5rem]">{x.title}</h2>
              <p className="max-w-md text-lg text-muted">{x.text}</p>
              <div>
                <Link href={x.href} className="ts-btn ts-btn-primary ts-btn-lg">
                  {t.common.learnMore}
                </Link>
              </div>
            </div>
          </section>
        ))}
        <Container>
          <Link href="/celebrations" className="ts-card ts-card-hover my-10 flex items-center gap-4 p-6" data-testid="pick-celebrate">
            <span className="ts-icon">
              <CakeIcon className="h-6 w-6" />
            </span>
            <span className="flex-1">
              <span className="block text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                {h.celebrateTitle}
              </span>
              <span className="block text-muted">{h.celebrateText}</span>
            </span>
            <span className="ts-btn ts-btn-ghost hidden sm:inline-flex">{t.common.learnMore}</span>
          </Link>
        </Container>
      </div>

      {/* 5. Dark feature band: eyebrow, centred heading, divider, two-column white cards with icon discs. */}
      <section className="ts-band-dark ts-section" id="features">
        <Container>
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="ts-eyebrow justify-center !text-faint">{h.eyebrow}</p>
            <h2 className="mt-3 text-3xl leading-tight sm:text-[3.25rem]">{h.featTitle}</h2>
            <span className="ts-divider" aria-hidden="true" />
            <p className="mt-5 text-lg text-muted">{h.featIntro}</p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2" data-testid="features">
            {feats.map((f, i) => {
              const Icon = featIcons[i];
              return (
                <div key={f.t} className="ts-card flex items-start gap-4 p-6">
                  <span className="ts-icon">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span>
                    <h3 className="font-sans text-lg font-bold">{f.t}</h3>
                    <p className="mt-1 text-[15px] text-muted">{f.d}</p>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-12 text-center">
            <Link href="/book" className="ts-btn ts-btn-primary ts-btn-lg">
              {t.nav.book}
            </Link>
          </div>
        </Container>
      </section>

      {/* 6. Popular packages on ivory. */}
      {popular.length > 0 && (
        <Section title={t.pages.popularTitle} id="popular" className="ts-band-light" center>
          <div className="grid gap-6 md:grid-cols-3">
            {popular.map((p) => (
              <PackageCard key={p.id} pkg={p} t={t} locale={locale} bookable bookHref={`/book?package=${p.id}`} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/pricing" className="ts-btn ts-btn-dark ts-btn-lg">
              {h.pricingCta}
            </Link>
          </div>
        </Section>
      )}

      {/* 7. How booking works: four centred step cards. */}
      <Section eyebrow={t.home.eyebrowProcess} title={`${t.home.stepsAccent} ${t.home.stepsRest}`} id="steps" center>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.t} className="ts-card p-7 text-center">
              <span className="ts-num">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-4 font-sans text-lg font-bold">{s.t}</h3>
              <p className="mt-2 text-[15px] text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 8. Gold statement band: one large serif sentence and a white CTA. */}
      <section className="ts-band-gold ts-section relative overflow-hidden" data-testid="statement-band">
        <Sparkle className="absolute right-[6%] top-8 h-16 w-16 text-ink/40" />
        <Container>
          <p className="max-w-4xl text-3xl leading-[1.25] sm:text-[3.25rem]" style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>
            {h.bandFrom.replace("{price}", from)}. <span className="opacity-80">{h.bandLine}.</span>
          </p>
          <Link href="/book" className="ts-btn ts-btn-primary ts-btn-lg mt-8">
            {t.nav.book}
          </Link>
        </Container>
      </section>

      {/* 9. Full price list. */}
      <Section eyebrow={t.home.eyebrowPrices} title={`${t.home.pricesAccent} ${t.home.pricesRest}`} id="prices" center>
        <PriceList pkgs={bookable} t={t} locale={locale} />
      </Section>

      {/* 10. Gallery. */}
      <Section title={t.pages.galleryHome} id="gallery" className="ts-band-light" center>
        <GalleryGrid images={photos} t={t} limit={6} />
        <div className="mt-8 text-center">
          <Link href="/gallery" className="ts-btn ts-btn-dark">
            {t.nav.gallery}
          </Link>
        </div>
      </Section>

      {/* 11. "See it first" split: illustration left, dark form panel right (real enquiry form). */}
      <section className="grid md:grid-cols-2" id="visit">
        <div aria-hidden="true" className="min-h-[280px] overflow-hidden">
          <CelebrationScene className="h-full w-full" />
        </div>
        <div className="ts-band-dark flex flex-col justify-center gap-4 px-6 py-14 sm:px-12 lg:px-20">
          <h2 className="text-4xl sm:text-5xl">{h.visitTitle}</h2>
          <p className="text-muted">{h.visitText}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/visit" className="ts-btn ts-btn-primary">
              {h.ctaVisit}
            </Link>
          </div>
          <div className="mt-2">
            <EnquiryForm t={t} purposes={purposes} />
          </div>
        </div>
      </section>

      {/* 12. Location. */}
      <Section title={t.pages.locationTitle} id="location" center>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="ts-card space-y-3 p-7">
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
              <Link href="/contact" className="ts-btn ts-btn-dark">
                {t.nav.contact}
              </Link>
            </div>
          </div>
          <MapEmbed address={biz.address} title={t.pages.locationTitle} />
        </div>
      </Section>

      {/* 13. FAQ as an open question list, plus a price card. */}
      <section className="ts-section border-t border-line" id="faq">
        <Container>
          <h2 className="mb-10 text-3xl sm:text-[2.5rem]">
            {t.home.faqAccent} {t.home.faqRest}
          </h2>
          <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
            <Faq items={faqs} open />
            <div className="ts-card h-fit p-7 lg:sticky lg:top-28">
              <p className="text-sm text-muted">{t.common.from}</p>
              <p className="text-5xl text-warm" style={{ fontFamily: "var(--font-heading)", fontWeight: 800 }}>
                {from}
              </p>
              <p className="mt-2 text-sm text-faint">{tl({ en: "Before GST. Exact price shown before you pay.", hi: "GST se pehle. Payment se pehle exact price dikhega." }, locale)}</p>
              <Link href="/book" className="ts-btn ts-btn-primary mt-5 w-full">
                {t.nav.book}
              </Link>
            </div>
          </div>
        </Container>
      </section>
      <JsonLd data={faqLd(faqs)} />
    </>
  );
}
