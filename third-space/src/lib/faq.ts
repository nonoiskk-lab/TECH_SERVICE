import { booking, refundTiers, type Locale } from "@/config/site";
import { tl, type Dict } from "@/i18n";

/**
 * FAQ items whose answers depend on config. `advancePercent` is 0 when the
 * site takes no online payment (pay at venue), and the answers say so.
 */
export function faqItems(t: Dict, locale: Locale, advancePercent: number = booking.advancePercent) {
  return t.faq.map((f) => {
    if (f.a === "advance") {
      return { q: f.q, a: advancePercent > 0 ? t.templates.advance.replace("{pct}", String(advancePercent)) : t.templates.venue };
    }
    if (f.a === "refund") {
      if (advancePercent === 0) return { q: f.q, a: t.templates.refundVenue };
      const tiers = refundTiers.map((r) => `${tl(r.label, locale)}: ${r.refundPercentOfAdvance}%`).join("; ");
      return { q: f.q, a: `${t.templates.refund} ${tiers}.` };
    }
    return f;
  });
}
