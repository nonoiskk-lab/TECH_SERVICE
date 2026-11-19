import { z } from "zod";
import { Prisma } from "@prisma/client";
import { addOnsFor, type Mode } from "@/config/site";
import { createBooking, holds, otp, paymentService } from "@/server/slots";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { queueConfirmation } from "@/server/notify";
import { bookablePackage, json } from "@/lib/api";
import { buildQuote } from "@/lib/pricing";
import type { BookingDraft } from "@/server/slots/types";

const Body = z.object({
  holdId: z.string().min(1),
  packageId: z.string(),
  mode: z.enum(["watch", "create", "celebrate", "visit"]),
  addOnIds: z.array(z.string()).max(20),
  themeId: z.string().optional(),
  guestCount: z.number().int().min(1).max(50),
  locale: z.enum(["en", "hi"]),
  guest: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().regex(/^[6-9]\d{9}$/),
    email: z.email().max(120),
  }),
  consent: z.object({
    /** Mandatory Customer Declaration (18+, terms, prohibitions, law, enforcement, responsibility). */
    declaration: z.literal(true),
    venue: z.literal(true),
    recording: z.boolean().optional(),
    /** Optional and separate: never bundled with the mandatory acceptance. */
    promotional: z.boolean().default(false),
    marketing: z.boolean().default(false),
  }),
  utm: z.record(z.string(), z.string().max(120)).default({}),
});

/**
 * Creates the payment order for a held slot (or the booking directly for a
 * free visit). The quote is recomputed from config; client numbers are never
 * trusted. The booking cannot complete without the mandatory declaration.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "BAD_REQUEST", issues: parsed.error.issues.map((i) => i.path.join(".")) }, 400);
  const b = parsed.data;
  const pkg = bookablePackage(b.packageId);
  if (!pkg) return json({ error: "PACKAGE_NOT_BOOKABLE" }, 403);
  const mode = b.mode as Mode;
  if (!(mode === pkg.mode || (mode === "celebrate" && pkg.mode === "watch"))) return json({ error: "BAD_MODE" }, 400);
  if (b.guestCount > pkg.capacity) return json({ error: "OVER_CAPACITY" }, 400);
  const needsRecording = pkg.service === "podcast" || pkg.service === "creator";
  if (needsRecording && b.consent.recording !== true) return json({ error: "CONSENT_REQUIRED" }, 400);
  if (!(await otp.isVerified(b.guest.phone))) return json({ error: "OTP_REQUIRED" }, 400);
  const allowed = new Set(addOnsFor(mode).map((a) => a.id));
  const addOnIds = b.addOnIds.filter((id) => allowed.has(id));
  const hold = await holds.get(b.holdId);
  if (!hold || hold.packageId !== pkg.id) return json({ error: "HOLD_EXPIRED" }, 410);
  const quote = buildQuote(pkg, addOnIds, mode)!;

  const draft: BookingDraft = {
    packageId: pkg.id,
    mode,
    addOnIds,
    themeId: mode === "celebrate" ? b.themeId : undefined,
    guest: b.guest,
    guestCount: b.guestCount,
    locale: b.locale,
    total: quote.total,
    advancePaid: quote.advance,
    balanceDue: quote.balance,
    utm: b.utm,
    acceptance: {
      locale: b.locale,
      allParticipantsAdult: true,
      guestsInformed: true,
      venueRulesAccepted: true,
      recordingConsent: needsRecording ? true : undefined,
      promotionalConsent: b.consent.promotional,
      marketingConsent: b.consent.marketing,
    },
  };

  if (quote.advance === 0) {
    const booking = await createBooking(draft, hold.id, {});
    await queueConfirmation(booking);
    return json({ bookingId: booking.id, token: booking.accessToken });
  }

  const payments = paymentService();
  const order = await payments.createOrder(quote.advance, hold.id.slice(0, 36));
  await db.pendingOrder.create({
    data: { orderId: order.orderId, holdId: hold.id, amount: order.amount, provider: order.provider, draft: draft as unknown as Prisma.InputJsonValue },
  });
  await audit(null, "guest", "payment.order_created", "Hold", hold.id, { orderId: order.orderId, amount: order.amount, provider: order.provider });
  return json({ orderId: order.orderId, amount: order.amount, provider: order.provider, keyId: order.keyId });
}
