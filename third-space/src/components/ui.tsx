import Link from "next/link";
import type { Dict } from "@/i18n";
import { tl } from "@/i18n";
import type { Locale, Package } from "@/config/site";
import { formatINR } from "@/lib/pricing";

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[var(--ts-maxw)] px-4 ${className}`}>{children}</div>;
}

export function PageHeader({ title, intro, eyebrow }: { title: string; intro?: string; eyebrow?: string }) {
  return (
    <div className="ts-hero-bg border-b border-line/60">
      <Container className="py-12 sm:py-16">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-warm">{eyebrow}</p>}
        <h1 className="text-3xl font-extrabold sm:text-5xl">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-lg text-muted">{intro}</p>}
      </Container>
    </div>
  );
}

export function Section({ title, children, id, className = "" }: { title?: string; children: React.ReactNode; id?: string; className?: string }) {
  return (
    <section id={id} className={`py-10 ${className}`} aria-labelledby={title && id ? `${id}-h` : undefined}>
      <Container>
        {title && (
          <h2 id={id ? `${id}-h` : undefined} className="mb-6 text-2xl font-bold sm:text-3xl">
            {title}
          </h2>
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
    <article className="ts-card flex flex-col p-5" data-testid={`package-${pkg.id}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-bold">{tl(pkg.name, locale)}</h3>
        <p className="shrink-0 text-right">
          <span className="block text-2xl font-extrabold text-warm" data-testid="package-price">
            {pkg.price === 0 ? t.common.free : formatINR(pkg.price)}
          </span>
        </p>
      </div>
      <p className="mt-1 text-sm text-faint">
        {durationLabel(pkg.durationMinutes, t)} · {t.common.upTo} {pkg.capacity} {t.common.guests}
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

export function Faq({ items, title }: { items: { q: string; a: string }[]; title: string }) {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
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
