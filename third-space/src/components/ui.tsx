import Link from "next/link";
import type { Dict } from "@/i18n";
import { tl } from "@/i18n";
import type { Locale, Package } from "@/config/site";
import { formatINR } from "@/lib/pricing";
import { durationText, hourlyRate, priceLabel } from "@/lib/session";

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[var(--ts-maxw)] px-4 ${className}`}>{children}</div>;
}

/** Two-tone heading: the accent part in gold, the rest in near-black. */
export function TwoTone({ accent, rest }: { accent?: string; rest: string }) {
  return (
    <>
      {accent && <span className="text-warm">{accent} </span>}
      {rest}
    </>
  );
}

/** Gold sparkle ornament (decorative). */
export function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M20 2c1.6 9.4 4.4 13.4 18 18-13.6 4.6-16.4 8.6-18 18-1.6-9.4-4.4-13.4-18-18C15.6 15.4 18.4 11.4 20 2z" fill="currentColor" />
    </svg>
  );
}

/**
 * Inner-page title banner: a dark espresso band with a centred heavy serif title,
 * short intro and gold ornaments. `art` is accepted for older callers and ignored.
 */
export function PageHeader({
  title,
  intro,
  eyebrow,
  accent,
}: {
  title: string;
  intro?: string;
  eyebrow?: string;
  accent?: string;
  art?: React.ReactNode;
}) {
  return (
    <div className="ts-band-dark relative overflow-hidden">
      <Sparkle className="absolute right-[8%] top-6 h-10 w-10 text-gold sm:h-14 sm:w-14" />
      <Sparkle className="absolute bottom-6 left-[6%] h-6 w-6 text-gold/70" />
      <span aria-hidden="true" className="absolute -right-16 -bottom-20 h-56 w-56 rounded-full bg-gold/15 blur-0" />
      <Container className="relative py-14 text-center sm:py-20">
        {eyebrow && <p className="ts-eyebrow mb-4 justify-center">{eyebrow}</p>}
        <h1 className="mx-auto max-w-4xl text-4xl leading-[1.08] sm:text-6xl">
          <TwoTone accent={accent} rest={title} />
        </h1>
        {intro && <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">{intro}</p>}
      </Container>
    </div>
  );
}

export function Section({
  title,
  accent,
  eyebrow,
  intro,
  children,
  id,
  className = "",
  center = false,
}: {
  title?: string;
  accent?: string;
  eyebrow?: string;
  intro?: string;
  children: React.ReactNode;
  id?: string;
  className?: string;
  center?: boolean;
}) {
  return (
    <section id={id} className={`ts-section ${className}`} aria-labelledby={title && id ? `${id}-h` : undefined}>
      <Container>
        {(eyebrow || title) && (
          <div className={`mb-10 sm:mb-14 ${center ? "mx-auto max-w-3xl text-center" : ""}`}>
            {eyebrow && <p className="ts-eyebrow mb-3">{eyebrow}</p>}
            {title && (
              <h2 id={id ? `${id}-h` : undefined} className="text-3xl leading-tight sm:text-[3.25rem]">
                <TwoTone accent={accent} rest={title} />
              </h2>
            )}
            {center && <span className="ts-divider" aria-hidden="true" />}
            {intro && <p className={`mt-4 text-lg text-muted ${center ? "mx-auto max-w-2xl" : "max-w-2xl"}`}>{intro}</p>}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}

export function durationLabel(minutes: number, t: Dict) {
  return minutes >= 60 ? `${minutes / 60} ${t.common.hours}` : `${minutes} ${t.common.minutes}`;
}

export function PackageCard({
  pkg,
  t,
  locale,
  bookable,
  bookHref,
}: {
  pkg: Package;
  t: Dict;
  locale: Locale;
  bookable: boolean;
  bookHref: string;
}) {
  return (
    <article className="ts-card flex flex-col border-t-[6px] border-t-[var(--ts-espresso)] p-6" data-testid={`package-${pkg.id}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-2xl">{tl(pkg.name, locale)}</h3>
        <p className="shrink-0 text-right">
          <span className="block text-2xl font-extrabold text-warm" data-testid="package-price">
            {priceLabel(pkg, formatINR, t.common.free)}
          </span>
          {hourlyRate(pkg) && pkg.pricing.kind !== "hourly" && (
            <span className="block text-xs text-faint">{t.common.thenRate.replace("{rate}", `${formatINR(hourlyRate(pkg)!)}${t.common.perHour}`)}</span>
          )}
          {pkg.pricing.kind === "hourly" && <span className="block text-xs text-faint">{t.common.perHourLong}</span>}
        </p>
      </div>
      <p className="mt-1 text-sm text-faint">
        {pkg.pricing.kind === "fixed" ? durationText(pkg.durationMinutes) : t.book.timeAuto} · {t.common.upTo} {pkg.capacity} {t.common.guests}
        {pkg.prepaidHours ? ` · ${pkg.prepaidHours} ${t.common.hours} prepaid` : ""}
      </p>
      <p className="mt-3 text-muted">{tl(pkg.summary, locale)}</p>
      <h4 className="mt-4 text-xs font-semibold uppercase tracking-widest text-faint">{t.common.includes}</h4>
      <ul className="mt-2 space-y-1 text-sm">
        {pkg.includes.map((i) => (
          <li key={i.en} className="flex gap-2">
            <span aria-hidden="true" className="text-warm">•</span>
            {tl(i, locale)}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-5">
        {bookable ? (
          <Link href={bookHref} className="ts-btn ts-btn-primary w-full">
            {t.common.bookThis}
          </Link>
        ) : (
          <span className="ts-btn ts-btn-ghost w-full" aria-disabled="true" data-testid="coming-soon">
            {t.common.comingSoon}
          </span>
        )}
      </div>
    </article>
  );
}

export function Faq({ items, title, open = false }: { items: { q: string; a: string }[]; title?: string; open?: boolean }) {
  if (open)
    return (
      <div className="space-y-7" data-testid="faq-list">
        {title && <h2 className="mb-2 text-3xl">{title}</h2>}
        {items.map((f) => (
          <div key={f.q}>
            <h3 className="text-2xl">{f.q}</h3>
            <p className="mt-2 max-w-3xl text-muted">{f.a}</p>
          </div>
        ))}
      </div>
    );
  return (
    <div>
      {title && <h2 className="mb-4 text-3xl">{title}</h2>}
      <div className="space-y-2">
        {items.map((f) => (
          <details key={f.q} className="ts-card group p-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold">
              {f.q}
              <span aria-hidden="true" className="text-warm transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

export function HowItWorks({ t }: { t: Dict }) {
  return (
    <ol className="grid gap-4 sm:grid-cols-4">
      {t.home.steps.map((s, i) => (
        <li key={s.t} className="ts-card p-5">
          <span className="font-heading text-3xl font-extrabold text-warm">{i + 1}</span>
          <h3 className="mt-2 font-bold">{s.t}</h3>
          <p className="mt-1 text-sm text-muted">{s.d}</p>
        </li>
      ))}
    </ol>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warm" />
          <span className="text-muted">{i}</span>
        </li>
      ))}
    </ul>
  );
}
