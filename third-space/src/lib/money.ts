/**
 * Money is stored and calculated as integer PAISE (1 rupee = 100 paise) everywhere:
 * database, quotes, payments, refunds. Convert only at the edges:
 *  - `rs()` for readable literals in config ("rs(1699)" = 169900 paise)
 *  - `parseRupees()` for admin form input
 *  - `formatINR()` for display
 */

/** Rupees (whole or with paise, e.g. 1699 or 1699.5) to integer paise. For config literals. */
export const rs = (rupees: number): number => Math.round(rupees * 100);

/** Admin form input ("1699", "1,699.50") to integer paise, or null when not a valid non-negative amount. */
export function parseRupees(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) && input >= 0 ? Math.round(input * 100) : null;
  if (typeof input !== "string") return null;
  const s = input.replace(/[,\s₹]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

/** Paise to a plain rupee string for form defaults ("1699" or "1699.50"). */
export function paiseToInput(paise: number): string {
  const whole = Math.trunc(paise / 100);
  const frac = Math.abs(paise % 100);
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, "0")}`;
}

/** Display: paise to "₹1,699" (or "₹1,699.50" when there are paise). */
export function formatINR(paise: number): string {
  const frac = Math.abs(paise % 100) !== 0;
  return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: frac ? 2 : 0, maximumFractionDigits: 2 });
}
