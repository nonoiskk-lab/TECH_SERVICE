import { z } from "zod";
import { addOnsFor, type Mode } from "@/config/site";
import { createBooking, holds, otp, paymentService } from "@/server/slots";
import type { BookingDraft } from "@/server/slots/types";
import { ensureCatalog } from "@/server/catalog";
import { findCoupon } from "@/server/coupons";
import { notifyBooking } from "@/server/notify";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { bookablePackage, json } from "@/lib/api";
import { buildQuote } from "@/lib/pricing";
import { resolveSession } from "@/lib/session";
import { flowEnv } from "@/lib/flow-env";
import { activeTitles } from "@/server/titles";

const Body = z.object({
  holdId: z.string().min(1),
  packageId: z.string(),
  mode: z.enum(["watch", "create", "celebrate", "visit"]),
  addOnIds: z.array(z.string()).max(20),
  themeId: z.string().optional(),
  session: z
    .object({
      titleId: z.string().max(60).optional(),
      episodeMinutes: z.number().int().optional(),
      episodes: z.number().int().optional(),
      reels: z.number().int().optional(),
      longVideos: z.number().int().optional(),
      hours: z.number().int().optional(),
    })
    .default({}),
  guestCount: z.number().int().min(1).max(50),
  locale: z.enum(["en", "hi"]),
  couponCode: z.string().trim().max(40).optional(),
  specialRequests: z.string().trim().max(1000).default(""),
  /** "advance" pays the configured advance online; "full" pays everything online. */
  payPlan: z.enum(["advance", "full"]).default("advance"),
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
 * Checkout. The quote is recomputed on the server from the catalogue; client
 * numbers are never trusted. Creates the booking as pending_payment with a
 * Razorpay order, or confirms it directly (free visit / pay at venue).
 */
export async function POST(req: Request) {
  await ensureCatalog();
  if (!(await rateLimit(await clientKey("checkout"), 15, 600))) return json({ error: "RATE_LIMITED" }, 429);
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

  const titles = pkg.pricing.kind === "title" ? await activeTitles() : [];
  const resolved = resolveSession(pkg, b.session, titles);
  if (!resolved.ok) return json({ error: resolved.reason }, 400);
  if (hold.durationMinutes !== resolved.session.durationMinutes) return json({ error: "SESSION_CHANGED" }, 409);
  const coupon = await findCoupon(b.couponCode, pkg.id);
  if (b.couponCode && !coupon) return json({ error: "COUPON_INVALID" }, 400);
  const { advancePercent } = flowEnv();
  const online = advancePercent > 0;
  const pct = online && b.payPlan === "full" ? 100 : advancePercent;
  const quote = buildQuote(pkg, addOnIds, mode, resolved.session, pct, { coupon })!;
  const title = titles.find((x) => x.id === b.session.titleId);

  const draft: BookingDraft = {
    packageId: pkg.id,
    mode,
    addOnIds,
    themeId: mode === "celebrate" ? b.themeId : undefined,
    titleId: title?.id,
    titleName: title?.name,
    sessionInput: Object.fromEntries(Object.entries(b.session).filter(([, v]) => v !== undefined)) as Record<string, string | number>,
    durationMinutes: resolved.session.durationMinutes,
    guest: b.guest,
    guestCount: b.guestCount,
    locale: b.locale,
    subtotal: quote.subtotal,
    discount: quote.discount,
    tax: quote.tax,
    total: quote.total,
    specialRequests: b.specialRequests,
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

  try {
    if (quote.advance === 0) {
      // Free visit, or pay-at-venue mode: confirmed now, nothing charged online.
      const booking = await createBooking(draft, hold.id, {
        status: "confirmed",
        couponCode: coupon?.code,
        payment: quote.total > 0 ? { provider: "venue", kind: "full", amount: quote.total, status: "pending" } : undefined,
      });
      await notifyBooking(booking.id, "booking_confirmed");
      return json({ bookingId: booking.id, token: booking.accessToken });
    }
    const payments = paymentService();
    const order = await payments.createOrder(quote.advance, hold.id.slice(0, 36));
    const booking = await createBooking(draft, hold.id, {
      status: "pending_payment",
      couponCode: coupon?.code,
      payment: { provider: order.provider, kind: pct === 100 ? "full" : "advance", orderId: order.orderId, amount: order.amount, status: "created" },
    });
    return json({ bookingId: booking.id, orderId: order.orderId, amount: order.amount, provider: order.provider, keyId: order.keyId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "HOLD_EXPIRED") return json({ error: "HOLD_EXPIRED" }, 410);
    if (msg === "COUPON_EXHAUSTED") return json({ error: "COUPON_INVALID" }, 400);
    throw e;
  }
}
