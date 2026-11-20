"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { captureFirstTouch, track, type AnalyticsEvent } from "@/lib/analytics";
import { LOCALE_COOKIE } from "@/i18n";

export function FirstTouch() {
  useEffect(() => {
    captureFirstTouch();
  }, []);
  return null;
}

/** Fires an analytics event once when mounted (e.g. view_package). */
export function TrackOnView({ event, props }: { event: AnalyticsEvent; props?: Record<string, string> }) {
  const key = JSON.stringify(props ?? {});
  useEffect(() => {
    track(event, JSON.parse(key));
  }, [event, key]);
  return null;
}

export function TrackedAnchor({
  event,
  props,
  children,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { event: AnalyticsEvent; props?: Record<string, string> }) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        track(event, props);
        rest.onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}

export function LocaleToggle({ next, label }: { next: "en" | "hi"; label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      data-testid="locale-toggle"
      className="min-h-11 rounded-full border border-line px-3 text-sm text-muted hover:border-warm hover:text-text"
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${next}; Max-Age=31536000; Path=/; SameSite=Lax`;
        router.refresh();
      }}
      lang={next === "hi" ? "hi-Latn" : "en"}
    >
      {label}
    </button>
  );
}

/** Renders children except on the given path prefixes (e.g. hide the sticky bar inside checkout). */
export function HideOn({ prefixes, children }: { prefixes: string[]; children: React.ReactNode }) {
  const pathname = usePathname();
  if (prefixes.some((p) => pathname.startsWith(p))) return null;
  return <>{children}</>;
}

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="ts-btn ts-btn-primary w-full text-sm print:hidden" onClick={() => window.print()}>
      {label}
    </button>
  );
}
