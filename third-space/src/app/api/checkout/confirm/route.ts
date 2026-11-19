import { createBooking, HoldExpiredError, paymentService } from "@/server/slots";
import type { BookingDraft } from "@/server/slots/types";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { queueConfirmation } from "@/server/notify";
import { json } from "@/lib/api";

/** Payment success callback: verify with the gateway, then create the booking. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { orderId?: string; paymentId?: string; signature?: string };
  if (typeof body.orderId !== "string") return json({ error: "BAD_REQUEST" }, 400);
  const pending = await db.pendingOrder.findUnique({ where: { orderId: body.orderId } });
  if (!pending) return json({ error: "ORDER_UNKNOWN" }, 404);
  const verified = await paymentService().verify({ orderId: body.orderId, paymentId: body.paymentId, signature: body.signature });
  if (!verified.ok) {
    await audit(null, "guest", "payment.verify_failed", "PendingOrder", body.orderId);
    return json({ error: "PAYMENT_NOT_CONFIRMED" }, 402);
  }
  try {
    const booking = await createBooking(pending.draft as unknown as BookingDraft, pending.holdId, {
      provider: pending.provider,
      orderId: pending.orderId,
      paymentId: verified.paymentId,
    });
    await db.pendingOrder.delete({ where: { orderId: pending.orderId } });
    await queueConfirmation(booking);
    return json({ bookingId: booking.id, token: booking.accessToken });
  } catch (e) {
    if (e instanceof HoldExpiredError) {
      // Money may have been captured after the hold ran out: flag it for staff to refund or rebook.
      await audit(null, "system", "payment.captured_after_hold_expired", "PendingOrder", pending.orderId, { amount: pending.amount, paymentId: verified.paymentId });
      return json({ error: "HOLD_EXPIRED" }, 410);
    }
    throw e;
  }
}
