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
  let evt: WebhookEvent;
  try {
    evt = JSON.parse(raw) as WebhookEvent;
  } catch {
    return new Response("Bad payload", { status: 400 });
  }
  // Idempotency: claim the event id first (unique key, so two simultaneous deliveries cannot both pass).
  // If processing then fails, the claim is released so Razorpay's retry is processed instead of skipped.
  if (eventId) {
    try {
      await db.webhookEvent.create({ data: { id: eventId, provider: "razorpay", type: evt.event } });
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") return new Response("ok (duplicate)");
      throw e;
    }
  }
  try {
    await handleEvent(evt);
  } catch (e) {
    if (eventId) await db.webhookEvent.delete({ where: { id: eventId } }).catch(() => {});
    console.error("razorpay webhook processing failed", evt.event, (e as Error).message);
    return new Response("processing failed", { status: 500 });
  }
  return new Response("ok");
}

type WebhookEvent = {
  event: string;
  payload?: {
    payment?: { entity?: { id: string; order_id: string; amount?: number; currency?: string; error_description?: string } };
    refund?: { entity?: { id: string; payment_id: string; amount: number } };
  };
};

async function handleEvent(evt: WebhookEvent) {
  await ensureCatalog();
  const payment = evt.payload?.payment?.entity;
  if (evt.event === "payment.captured" && payment) {
    // The gateway's own amount and currency are checked against what we ordered (paise).
    const gateway = typeof payment.amount === "number" ? { amount: payment.amount, currency: payment.currency } : undefined;
    const r = await confirmPayment(payment.order_id, payment.id, "razorpay-webhook", gateway);
    if (r.state !== "unknown_order" && r.state !== "amount_mismatch" && r.fresh) await notifyBooking(r.bookingId, r.state === "confirmed" ? "payment_received" : "payment_issue");
  } else if (evt.event === "payment.failed" && payment) {
    await db.payment.updateMany({ where: { orderId: payment.order_id, status: "created" }, data: { status: "failed", note: payment.error_description ?? "" } });
    await audit(null, "razorpay-webhook", "payment.failed", "Payment", payment.order_id);
  } else if (evt.event === "refund.processed" && evt.payload?.refund?.entity) {
    const rf = evt.payload.refund.entity;
    const orig = await db.payment.findUnique({ where: { paymentId: rf.payment_id } });
    if (orig) {
      await db.payment.upsert({
        where: { refundId: rf.id },
        create: { bookingId: orig.bookingId, provider: "razorpay", kind: "refund", refundId: rf.id, amount: rf.amount, status: "refunded" },
        update: { status: "refunded" },
      });
      await db.booking.update({ where: { id: orig.bookingId }, data: { status: "refunded" } });
      await audit(null, "razorpay-webhook", "refund.processed", "Booking", orig.bookingId, { refundId: rf.id });
    }
  }
}
