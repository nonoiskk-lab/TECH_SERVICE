import Link from "next/link";
import type { Dict } from "@/i18n";
import type { Locale } from "@/config/site";
import { LocaleToggle } from "./client-bits";

export function Wordmark({ className = "" }: { className?: string }) {
  // No logo file has been supplied yet; this text wordmark stands in until
  // public/brand/logo.svg exists (see docs/STAGE_REPORT.md, NEEDS OWNER).
  return (
    <span className={`whitespace-nowrap font-heading text-base font-extrabold tracking-[0.14em] sm:text-lg ${className}`}>
      THIRD<span className="text-warm"> SPACE</span>
    </span>
  );
}

export function SiteHeader({ t, locale }: { t: Dict; locale: Locale }) {
  const links = [
    { href: "/watch", label: t.nav.watch },
    { href: "/create", label: t.nav.create },
    { href: "/celebrate", label: t.nav.celebrate },
    { href: "/visit", label: t.nav.visit },
    { href: "/policies", label: t.nav.policies },
    { href: "/contact", label: t.nav.contact },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/85 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded focus:bg-warm focus:px-3 focus:py-2 focus:text-warm-ink">
        {t.nav.skip}
      </a>
      <div className="mx-auto flex h-16 max-w-[var(--ts-maxw)] items-center justify-between gap-3 px-4">
        <Link href="/" aria-label="THIRD SPACE home" className="flex min-h-11 items-center">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3 py-2 text-sm text-muted hover:text-text">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LocaleToggle next={locale === "en" ? "hi" : "en"} label={locale === "en" ? "Hinglish" : "English"} />
          <Link href="/book" className="ts-btn ts-btn-primary hidden text-sm sm:inline-flex">
            {t.nav.book}
          </Link>
          <details className="relative lg:hidden">
            <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-full border border-line px-3 text-sm">
              {t.nav.menu}
            </summary>
            <nav aria-label="Mobile" className="ts-card absolute right-0 mt-2 flex w-60 flex-col p-2 shadow-2xl">
              {[{ href: "/", label: t.nav.home }, ...links].map((l) => (
                <Link key={l.href} href={l.href} className="flex min-h-11 items-center rounded-lg px-3 hover:bg-raised">
                  {l.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
