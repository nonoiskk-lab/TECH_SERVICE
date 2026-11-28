import Link from "next/link";
import type { Package, Locale } from "@/config/site";
import { tl, type Dict } from "@/i18n";
import { formatINR } from "@/lib/pricing";
import { priceLabel } from "@/lib/session";

/** Public price list: the owner's launch packages, in config order. */
export function PriceList({ pkgs, t, locale }: { pkgs: Package[]; t: Dict; locale: Locale }) {
  const rows = pkgs.filter((p) => p.priceList);
  return (
    <div className="ts-card overflow-hidden" data-testid="price-list">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{t.home.pricesTitle}</caption>
        <thead className="bg-raised text-xs uppercase tracking-widest text-faint">
          <tr>
            <th className="px-4 py-3 font-semibold">{t.book.stepPackage}</th>
            <th className="px-4 py-3 font-semibold">{t.home.startingPrice}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-t border-line/60 align-top">
              <td className="px-4 py-3">
                <Link href={p.mode === "celebrate" ? "/celebrations" : p.mode === "watch" ? "/private-theatre" : `/book?package=${p.id}`} className="font-semibold hover:text-warm">
                  {tl(p.priceList!.label, locale)}
                </Link>
                <span className="block text-muted">{tl(p.priceList!.includes, locale)}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-heading text-lg font-extrabold text-warm">{priceLabel(p, formatINR, t.common.free)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line/60 px-4 py-3 text-xs text-faint">{t.home.pricesNote}</p>
    </div>
  );
}
