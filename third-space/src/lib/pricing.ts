import { addOns, booking, refundTiers, type L, type Mode, type Package } from "@/config/site";
import type { Session } from "./session";

export type QuoteLine = { label: L; amount: number; kind: "base" | "addon" | "tax" };

export type Quote = {
  lines: QuoteLine[];
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
export function buildQuote(pkg: Package | undefined, addOnIds: string[], flowMode: Mode | undefined, session: Session | null): Quote | null {
  if (!pkg || !session) return null;
  const mode = flowMode ?? pkg.mode;
  const lines: QuoteLine[] = [{ label: session.label, amount: session.basePrice, kind: "base" }];
  for (const id of addOnIds) {
    const a = addOns.find((x) => x.id === id && x.modes.includes(mode));
    if (a) lines.push({ label: a.name, amount: a.price, kind: "addon" });
  }
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const tax = round((subtotal * booking.taxPercent) / 100);
  const total = subtotal + tax;
  const advance = total === 0 ? 0 : round((total * booking.advancePercent) / 100);
  return { lines, subtotal, tax, total, advance, balance: total - advance };
}

export function formatINR(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

/** Refund for a cancellation `hoursBefore` the slot, as an amount of the advance. */
export function refundFor(advance: number, hoursBefore: number): number {
  const tier = refundTiers.find((t) => hoursBefore >= t.minHoursBefore) ?? refundTiers[refundTiers.length - 1];
  return round((advance * tier.refundPercentOfAdvance) / 100);
}
