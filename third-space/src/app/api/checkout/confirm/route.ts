import { confirmPayment, paymentService } from "@/server/slots";
import { ensureCatalog } from "@/server/catalog";
import { notifyBooking } from "@/server/notify";
import { audit } from "@/server/audit";
import { json } from "@/lib/api";

/**
 * Browser callback after Razorpay Checkout. The signature is verified on the
 * server; the frontend's word is never trusted. The webhook does the same
 * job if this call never arrives.
 */
export async function POST(req: Request) {
  await ensureCatalog();
  const body = (await req.json().catch(() => ({}))) as { orderId?: string; paymentId?: string; signature?: string };
  if (typeof body.orderId !== "string") return json({ error: "BAD_REQUEST" }, 400);
  const verified = await paymentService().verify({ orderId: body.orderId, paymentId: body.paymentId, signature: body.signature });
  if (!verified.ok) {
    await audit(null, "guest", "payment.verify_failed", "Payment", body.orderId);
    return json({ error: "PAYMENT_NOT_CONFIRMED" }, 402);
  }
  const r = await confirmPayment(body.orderId, verified.paymentId, "guest");
  if (r.state === "unknown_order") return json({ error: "ORDER_UNKNOWN" }, 404);
  if (r.fresh) await notifyBooking(r.bookingId, r.state === "confirmed" ? "payment_received" : "payment_issue");
  if (r.state === "refund_pending") return json({ error: "HOLD_EXPIRED", bookingId: r.bookingId }, 410);
  return json({ bookingId: r.bookingId, token: r.token });
}
