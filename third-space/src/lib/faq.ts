import { booking, refundTiers, type Locale } from "@/config/site";
import { tl, type Dict } from "@/i18n";

/** FAQ items with answers that depend on config resolved from config. */
export function faqItems(t: Dict, locale: Locale) {
  return t.faq.map((f) => {
    if (f.a === "advance") return { q: f.q, a: t.templates.advance.replace("{pct}", String(booking.advancePercent)) };
    if (f.a === "refund") {
      const tiers = refundTiers.map((r) => `${tl(r.label, locale)}: ${r.refundPercentOfAdvance}%`).join("; ");
      return { q: f.q, a: `${t.templates.refund} ${tiers}.` };
    }
    return f;
  });
}
