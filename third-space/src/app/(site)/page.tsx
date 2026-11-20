import Link from "next/link";
import { isLegalGateOpen } from "@/config/site";
import { bookablePackages, fromPrice } from "@/config/packages";
import { PriceList } from "@/components/price-list";
import { getDict } from "@/lib/locale";
import { faqItems } from "@/lib/faq";
import { formatINR } from "@/lib/pricing";
import { Container, Faq, Section, TwoTone } from "@/components/ui";
import { JsonLd, faqLd } from "@/components/json-ld";
import { CakeIcon, MicIcon, ScreenIcon } from "@/components/icons";
import { CelebrationScene, CreatorScene, PodcastScene, RoomScene } from "@/components/illustrations";
import { flowEnv } from "@/lib/flow-env";
import { tl } from "@/i18n";
import { PackageCard } from "@/components/ui";
import { publicBusiness } from "@/lib/business";
import { galleryImages, testimonials } from "@/server/content";
import { GalleryGrid, MapEmbed, Testimonials } from "@/components/site-sections";

export default async function Home() {
  const { t, locale } = await getDict();
  const gateOpen = isLegalGateOpen();
  const { advancePercent } = flowEnv();
  const faqs = faqItems(t, locale, advancePercent);
  const steps = advancePercent > 0 ? t.home.steps : t.home.steps.map((s, i) => (i === 2 ? t.home.stepVenue : s));
  const from = formatINR(fromPrice(gateOpen));
  const biz = publicBusiness(locale);
  const bookable = bookablePackages(gateOpen);
  const popular = ["theatre-classic", "podcast", "celebration", "creator-plan"]
    .map((id) => bookable.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 3);
  // Amenities come only from configured package inclusions (nothing invented).
  const amenities = [...new Map(bookable.filter((p) => p.mode !== "visit").flatMap((p) => p.includes).map((i) => [i.en, tl(i, locale)])).values()].slice(0, 9);
  const [photos, reviews] = await Promise.all([galleryImages(6), testimonials(6)]);
  const cards = [
    { href: "/podcast-studio", title: t.home.pickCreate, text: t.home.pickCreateText, soon: false, id: "create", Icon: MicIcon, Art: PodcastScene },
    { href: "/celebrations", title: t.home.pickCelebrate, text: t.home.pickCelebrateText, soon: false, id: "celebrate", Icon: CakeIcon, Art: CelebrationScene },
    {
      href: "/private-theatre",
      title: t.home.pickWatch,
      text: gateOpen ? t.home.pickWatchOpen : t.home.pickWatchClosed,
      soon: !gateOpen,
      id: "watch",
      Icon: ScreenIcon,
      Art: RoomScene,
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
            <p className="mt-3 text-xs uppercase tracking-[0.25em] text-faint" data-testid="endorsement">
              {t.pages.endorsement}
            </p>
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
          {/* Decorative collage of illustrated rooms (real photos replace these later). */}
          <div aria-hidden="true" className="relative mx-auto h-[300px] w-full max-w-[460px] sm:h-[400px]">
            <div className="absolute left-0 top-4 h-48 w-48 overflow-hidden rounded-full shadow-xl ring-8 ring-[var(--ts-bg)] sm:h-60 sm:w-60">
              <PodcastScene className="h-full w-full" />
            </div>
            <div className="absolute right-0 top-0 h-36 w-36 overflow-hidden rounded-full shadow-xl ring-8 ring-[var(--ts-bg)] sm:h-44 sm:w-44">
              <CreatorScene className="h-full w-full" />
            </div>
            <div className="absolute bottom-0 right-6 h-44 w-44 overflow-hidden rounded-full shadow-xl ring-8 ring-[var(--ts-bg)] sm:h-56 sm:w-56">
              <CelebrationScene className="h-full w-full" />
            </div>
            <div className="absolute bottom-6 left-6 rounded-full bg-card px-4 py-2 text-sm shadow-lg">
              {t.common.from} <strong className="font-heading text-warm">{from}</strong>
            </div>
          </div>
        </Container>
      </div>

      <Section eyebrow={t.home.eyebrowServices} accent={t.home.pickerAccent} title={t.home.pickerRest} id="picker" center>
        <div className="grid gap-5 sm:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.id} href={c.href} className="ts-card ts-glow group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-gold" data-testid={`pick-${c.id}`}>
              <span className="block aspect-[4/3] overflow-hidden" aria-hidden="true">
                <c.Art className="h-full w-full transition duration-300 group-hover:scale-105" />
              </span>
              <span className="flex flex-col p-7">
              <span className="flex items-start justify-between gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-raised text-warm">
                  <c.Icon className="h-7 w-7" />
                </span>
                {c.soon && <span className="rounded-full border border-line px-2.5 py-1 text-xs text-faint">{t.common.comingSoon}</span>}
              </span>
              <span className="mt-5 font-heading text-2xl">{c.title}</span>
              <span className="mt-2 text-muted">{c.text}</span>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-warm">{t.common.learnMore} →</span>
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {popular.length > 0 && (
        <Section title={t.pages.popularTitle} id="popular">
          <div className="grid gap-5 md:grid-cols-3">
            {popular.map((p) => (
              <PackageCard key={p.id} pkg={p} t={t} locale={locale} bookable bookHref={`/book?package=${p.id}`} />
            ))}
          </div>
        </Section>
      )}

      <Section eyebrow={t.home.eyebrowPrices} accent={t.home.pricesAccent} title={t.home.pricesRest} id="prices" className="bg-card">
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

      <Section title={t.pages.galleryHome} id="gallery">
        <GalleryGrid images={photos} t={t} limit={6} />
        <Link href="/gallery" className="mt-5 inline-block text-sm font-semibold text-warm">
          {t.nav.gallery} →
        </Link>
      </Section>

      {amenities.length > 0 && (
        <Section title={t.pages.amenitiesTitle} id="amenities" className="bg-card">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="amenities">
            {amenities.map((a) => (
              <li key={a} className="flex gap-3 rounded-2xl border border-line p-4">
                <span aria-hidden="true" className="text-warm">✦</span>
                <span className="text-muted">{a}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {reviews.length > 0 && (
        <Section title={t.pages.testimonialsTitle} id="testimonials">
          <Testimonials items={reviews} />
        </Section>
      )}

      <section id="stories" className="py-4">
        <Container>
          <div className="ts-dark rounded-[var(--ts-radius)] p-8 sm:p-12">
            <p className="ts-eyebrow">{t.home.eyebrowStories}</p>
            <h2 className="mt-3 text-3xl sm:text-5xl">
              <TwoTone accent={t.home.storiesTitle.split(" ")[0]} rest={t.home.storiesTitle.split(" ").slice(1).join(" ")} />
            </h2>
            <p className="mt-4 max-w-2xl text-muted">{t.home.storiesText}</p>
            <Link href="/podcast-studio" className="ts-btn ts-btn-primary ts-btn-arrow mt-6">
              {t.home.pickCreate}
            </Link>
          </div>
        </Container>
      </section>

      <Section title={t.pages.locationTitle} id="location">
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
