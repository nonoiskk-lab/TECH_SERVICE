import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";
import { confirmPayment } from "@/server/slots";
import { ensureCatalog } from "@/server/catalog";
import { notifyBooking } from "@/server/notify";
import { audit } from "@/server/audit";

/**
 * Razorpay webhook (Dashboard → Webhooks → this URL, secret = RAZORPAY_WEBHOOK_SECRET).
 * Events: payment.captured, payment.failed, refund.processed.
 * Verifies X-Razorpay-Signature on the raw body and ignores repeated event ids.
 */
export async function POST(req: Request) {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET ?? "").trim();
  if (!secret) return new Response("Webhook not configured", { status: 503 });
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    await audit(null, "razorpay", "webhook.bad_signature", "Webhook");
    return new Response("Bad signature", { status: 400 });
  }
  const eventId = req.headers.get("x-razorpay-event-id") ?? "";
  const evt = JSON.parse(raw) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string; error_description?: string } }; refund?: { entity?: { id: string; payment_id: string; amount: number } } };
  };
  if (eventId) {
    const seen = await db.webhookEvent.findUnique({ where: { id: eventId } });
    if (seen) return new Response("ok (duplicate)");
    await db.webhookEvent.create({ data: { id: eventId, provider: "razorpay", type: evt.event } });
  }
  await ensureCatalog();
  const payment = evt.payload?.payment?.entity;
  if (evt.event === "payment.captured" && payment) {
    const r = await confirmPayment(payment.order_id, payment.id, "razorpay-webhook");
    if (r.state !== "unknown_order" && r.fresh) await notifyBooking(r.bookingId, r.state === "confirmed" ? "payment_received" : "payment_issue");
  } else if (evt.event === "payment.failed" && payment) {
    await db.payment.updateMany({ where: { orderId: payment.order_id, status: "created" }, data: { status: "failed", note: payment.error_description ?? "" } });
    await audit(null, "razorpay-webhook", "payment.failed", "Payment", payment.order_id);
  } else if (evt.event === "refund.processed" && evt.payload?.refund?.entity) {
    const rf = evt.payload.refund.entity;
    const orig = await db.payment.findUnique({ where: { paymentId: rf.payment_id } });
    if (orig) {
      await db.payment.upsert({
        where: { refundId: rf.id },
        create: { bookingId: orig.bookingId, provider: "razorpay", kind: "refund", refundId: rf.id, amount: Math.round(rf.amount / 100), status: "refunded" },
        update: { status: "refunded" },
      });
      await db.booking.update({ where: { id: orig.bookingId }, data: { status: "refunded" } });
      await audit(null, "razorpay-webhook", "refund.processed", "Booking", orig.bookingId, { refundId: rf.id });
    }
  }
  return new Response("ok");
}
