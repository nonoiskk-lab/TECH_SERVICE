import { z } from "zod";
import { addOnsFor, type Mode } from "@/config/site";
import { bookings, holds, payments } from "@/server/slots";
import { bookablePackage, json } from "@/lib/api";
import { buildQuote } from "@/lib/pricing";
import { isVerified } from "@/lib/verified-phones";
import { savePending } from "@/lib/pending-orders";

const Body = z.object({
  holdId: z.string().min(1),
  packageId: z.string(),
  mode: z.enum(["watch", "create", "celebrate", "visit"]),
  addOnIds: z.array(z.string()).max(20),
  themeId: z.string().optional(),
  guest: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().regex(/^[6-9]\d{9}$/),
    email: z.email().max(120),
  }),
  consent: z.object({ venue: z.literal(true), recording: z.boolean().optional() }),
});

/**
 * Creates the payment order for a held slot. The quote is recomputed here from
 * config; the client's numbers are never trusted.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "BAD_REQUEST" }, 400);
  const b = parsed.data;
  const pkg = bookablePackage(b.packageId);
  if (!pkg) return json({ error: "PACKAGE_NOT_BOOKABLE" }, 403);
  const mode = b.mode as Mode;
  const modeOk = mode === pkg.mode || (mode === "celebrate" && pkg.mode === "watch");
  if (!modeOk) return json({ error: "BAD_MODE" }, 400);
  if (mode === "create" && b.consent.recording !== true) return json({ error: "CONSENT_REQUIRED" }, 400);
  if (!isVerified(b.guest.phone)) return json({ error: "OTP_REQUIRED" }, 400);
  const allowed = new Set(addOnsFor(mode).map((a) => a.id));
  const addOnIds = b.addOnIds.filter((id) => allowed.has(id));
  const hold = await holds.get(b.holdId);
  if (!hold || hold.packageId !== pkg.id) return json({ error: "HOLD_EXPIRED" }, 410);
  const quote = buildQuote(pkg, addOnIds, mode)!;
  const draft = {
    packageId: pkg.id,
    mode,
    start: hold.start,
    end: hold.end,
    addOnIds,
    themeId: mode === "celebrate" ? b.themeId : undefined,
    guest: b.guest,
    total: quote.total,
    advancePaid: quote.advance,
    balanceDue: quote.balance,
    consentAt: new Date().toISOString(),
  };
  if (quote.advance === 0) {
    const booking = await bookings.create(draft, hold.id);
    return json({ bookingId: booking.id });
  }
  const order = await payments.createOrder(hold.id, quote.advance);
  savePending(order.orderId, { draft, holdId: hold.id });
  return json({ orderId: order.orderId, amount: order.amount, provider: order.provider });
}
