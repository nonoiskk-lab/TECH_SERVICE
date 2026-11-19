import { bookings, HoldExpiredError, payments } from "@/server/slots";
import { json } from "@/lib/api";
import { takePending } from "@/lib/pending-orders";

/** Payment success callback. Mock gateway: confirms any order it created. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { orderId?: string };
  if (typeof body.orderId !== "string") return json({ error: "BAD_REQUEST" }, 400);
  const { ok } = await payments.confirm(body.orderId);
  if (!ok) return json({ error: "PAYMENT_NOT_CONFIRMED" }, 402);
  const p = takePending(body.orderId);
  if (!p) return json({ error: "ORDER_UNKNOWN" }, 404);
  try {
    const booking = await bookings.create(p.draft, p.holdId);
    // NOTE: WhatsApp + email confirmation would be sent here (not built yet; see STAGE_REPORT).
    return json({ bookingId: booking.id });
  } catch (e) {
    if (e instanceof HoldExpiredError) return json({ error: "HOLD_EXPIRED" }, 410);
    throw e;
  }
}
