import Link from "next/link";
import type { Dict } from "@/i18n";
import type { Locale } from "@/config/site";
import { LocaleToggle } from "./client-bits";

/** Logo mark: a doorway in a gold circle (the "third place" between home and work). */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#CAA05C" />
      <path d="M20 50V30a12 12 0 0 1 24 0v20z" fill="#1C1C1D" />
      <path d="M26 50V32a6 6 0 0 1 12 0v18z" fill="#F7F1E6" />
      <circle cx="35" cy="41" r="1.6" fill="#CAA05C" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap font-sans text-base font-medium tracking-[0.08em] sm:text-lg ${className}`}>
      <LogoMark className="h-8 w-8 sm:h-9 sm:w-9" />
      <span>
        THIRD<span className="text-warm"> SPACE</span>
      </span>
    </span>
  );
}

export function SiteHeader({ t, locale }: { t: Dict; locale: Locale }) {
  const links = [
    { href: "/private-theatre", label: t.nav.watch },
    { href: "/podcast-studio", label: t.nav.create },
    { href: "/creative-studio", label: t.nav.creative },
    { href: "/celebrations", label: t.nav.celebrate },
    { href: "/pricing", label: t.nav.pricing },
  ];
  const more = [
    { href: "/creator-plans", label: t.nav.plans },
    { href: "/gallery", label: t.nav.gallery },
    { href: "/contact", label: t.nav.contact },
    { href: "/visit", label: t.nav.visit },
    { href: "/account", label: t.nav.account },
    { href: "/about", label: t.nav.about },
    { href: "/faqs", label: t.nav.faqs },
    { href: "/my-booking", label: t.nav.myBooking },
    { href: "/policies", label: t.nav.policies },
  ];
  return (
    <header className="sticky top-0 z-40 bg-white shadow-[var(--ts-shadow-nav)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded focus:bg-warm focus:px-3 focus:py-2 focus:text-warm-ink">
        {t.nav.skip}
      </a>
      <div className="mx-auto flex h-20 max-w-[1320px] items-center justify-between gap-3 px-4 lg:px-6">
        <Link href="/" aria-label="THIRD SPACE home" className="flex min-h-11 items-center">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-0.5 xl:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap px-2.5 py-5 text-[15px] tracking-[0.02em] text-text transition-colors hover:text-warm">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LocaleToggle next={locale === "en" ? "hi" : "en"} label={locale === "en" ? "Hinglish" : "English"} />
          <Link href="/account" className="hidden min-h-11 items-center whitespace-nowrap px-2.5 text-[15px] hover:text-warm xl:inline-flex" data-testid="nav-account">
            {t.nav.account}
          </Link>
          <Link href="/visit" className="ts-btn ts-btn-ghost hidden whitespace-nowrap md:inline-flex">
            {t.nav.visit}
          </Link>
          <Link href="/book" className="ts-btn ts-btn-primary hidden whitespace-nowrap sm:inline-flex">
            {t.nav.book}
          </Link>
          <details className="relative xl:hidden">
            <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-md border border-line px-3 text-sm">
              {t.nav.menu}
            </summary>
            <nav aria-label="Mobile" className="ts-card absolute right-0 mt-2 flex max-h-[75vh] w-64 flex-col overflow-y-auto p-2 shadow-2xl">
              {[{ href: "/", label: t.nav.home }, ...links, ...more].map((l) => (
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
