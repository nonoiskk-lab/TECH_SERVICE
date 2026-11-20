import "server-only";
import { booking, contact, hours, refundTiers, site, siteUrl, type Locale } from "@/config/site";
import { tl } from "@/i18n";

/**
 * Public business facts, read once from config/env. Header, footer, contact
 * page, policies and JSON-LD all render from this object, and the CI
 * consistency check compares them against /api/public-config.
 */
export function publicBusiness(locale: Locale = "en") {
  return {
    name: site.brand,
    phone: contact.phone,
    whatsapp: contact.whatsapp,
    email: contact.email,
    address: contact.fullAddress,
    mapUrl: contact.mapUrl,
    hoursLabel: tl(hours.label, locale),
    open: hours.open,
    close: hours.close,
    advancePercent: booking.advancePercent,
    holdMinutes: booking.holdMinutes,
    refundTiers: refundTiers.map((t) => ({ minHoursBefore: t.minHoursBefore, percent: t.refundPercentOfAdvance })),
    url: siteUrl(),
  };
}

export type PublicBusiness = ReturnType<typeof publicBusiness>;

/** wa.me link with prefilled text, or null if no WhatsApp number is configured. */
export function whatsappHref(number: string, text: string): string | null {
  const digits = number.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function telHref(number: string): string | null {
  const clean = number.replace(/[^\d+]/g, "");
  return clean ? `tel:${clean}` : null;
}
