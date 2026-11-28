"use client";

/**
 * Privacy-safe analytics. Events never carry name, phone or email: only ids
 * such as packageId. First-touch UTM is kept in a cookie for 30 days.
 */
export type AnalyticsEvent =
  | "view_package"
  | "select_slot"
  | "hold_started"
  | "hold_expired"
  | "payment_started"
  | "payment_success"
  | "consent_signed"
  | "whatsapp_click"
  | "enquiry_submitted";

export const FIRST_TOUCH_COOKIE = "ts_ft";
const THIRTY_DAYS = 60 * 60 * 24 * 30;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

type Props = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export function getFirstTouch(): Record<string, string> {
  try {
    const raw = readCookie(FIRST_TOUCH_COOKIE);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Store UTM + landing page on the first visit only. */
export function captureFirstTouch() {
  if (readCookie(FIRST_TOUCH_COOKIE)) return;
  const params = new URLSearchParams(window.location.search);
  const data: Record<string, string> = { landing: window.location.pathname };
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) data[k] = v.slice(0, 100);
  }
  if (document.referrer) {
    try {
      const host = new URL(document.referrer).host;
      if (host !== window.location.host) data.referrer = host;
    } catch {}
  }
  data.at = new Date().toISOString().slice(0, 10);
  document.cookie = `${FIRST_TOUCH_COOKIE}=${encodeURIComponent(JSON.stringify(data))}; Max-Age=${THIRTY_DAYS}; Path=/; SameSite=Lax`;
}

export function track(event: AnalyticsEvent, props: Props = {}) {
  const payload = { event, ...props, ...prefixed(getFirstTouch()) };
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
  } catch {}
}

function prefixed(ft: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(ft)) out[`ft_${k}`] = v;
  return out;
}
