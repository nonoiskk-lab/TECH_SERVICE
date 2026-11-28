import { addOns, booking, refundTiers, type AddOn, type L, type Mode, type Package } from "@/config/site";
import type { Session } from "./session";

export type QuoteLine = { label: L; amount: number; kind: "base" | "addon" | "tax" };

export type Quote = {
  lines: QuoteLine[];
  /** Before discount. */
  gross: number;
  discount: number;
  /** After discount, before tax. */
  subtotal: number;
  tax: number;
  total: number;
  advance: number;
  balance: number;
};

const round = (n: number) => Math.round(n);

/**
 * Itemised quote. The estimator and the checkout both call this, so the price a
 * guest sees while exploring is the price they pay. `session` comes from
 * resolveSession() (time and base price decided automatically).
 */
export function buildQuote(
  pkg: Package | undefined,
  addOnIds: string[],
  flowMode: Mode | undefined,
  session: Session | null,
  advancePercent: number = booking.advancePercent,
  opts: { addOns?: AddOn[]; taxPercent?: number; coupon?: CouponRule | null } = {},
): Quote | null {
  if (!pkg || !session) return null;
  const mode = flowMode ?? pkg.mode;
  const catalogAddOns = opts.addOns ?? addOns;
  const taxPercent = opts.taxPercent ?? booking.taxPercent;
  const lines: QuoteLine[] = [{ label: session.label, amount: session.basePrice, kind: "base" }];
  for (const id of addOnIds) {
    const a = catalogAddOns.find((x) => x.id === id && x.modes.includes(mode));
    if (a) lines.push({ label: a.name, amount: a.price, kind: "addon" });
  }
  const gross = lines.reduce((s, l) => s + l.amount, 0);
  const discount = couponDiscount(opts.coupon ?? null, gross, pkg.id);
  const subtotal = gross - discount;
  const tax = round((subtotal * taxPercent) / 100);
  const total = subtotal + tax;
  const advance = total === 0 ? 0 : round((total * advancePercent) / 100);
  return { lines, gross, discount, subtotal, tax, total, advance, balance: total - advance };
}

/** Coupon terms the quote needs (validity is checked on the server). */
export type CouponRule = { code: string; kind: "percent" | "flat"; value: number; minSubtotal: number; packageIds: string[] };

export function couponDiscount(c: CouponRule | null, gross: number, packageId: string): number {
  if (!c || gross <= 0) return 0;
  if (c.packageIds.length > 0 && !c.packageIds.includes(packageId)) return 0;
  if (gross < c.minSubtotal) return 0;
  const d = c.kind === "percent" ? round((gross * Math.min(100, Math.max(0, c.value))) / 100) : c.value;
  return Math.max(0, Math.min(d, gross));
}

export { formatINR } from "./money";

/** Refund for a cancellation `hoursBefore` the slot, as an amount of the advance. */
export function refundFor(advance: number, hoursBefore: number): number {
  const tier = refundTiers.find((t) => hoursBefore >= t.minHoursBefore) ?? refundTiers[refundTiers.length - 1];
  return round((advance * tier.refundPercentOfAdvance) / 100);
}
