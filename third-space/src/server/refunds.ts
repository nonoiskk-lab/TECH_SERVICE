import "server-only";
import { db } from "./db";
import { audit } from "./audit";
import { paymentService } from "./payments";

export type RefundResult =
  | { ok: true; refundId: string; status: "pending" | "processed"; already: boolean }
  | { ok: false; error: string };

/**
 * Sends a refund for a booking that is `refund_pending` to the payment gateway.
 * - Amount = booking.refundAmount (or the whole advance for a late capture), in paise.
 * - Never more than was captured minus refunds already requested.
 * - Idempotent: the receipt `refund-<bookingId>` is also Razorpay's idempotency key, and the
 *   Payment row is keyed by the gateway's refund id, so a double click cannot refund twice.
 * - The booking becomes `refunded` only when the gateway says processed (webhook or immediately);
 *   until then it stays `refund_pending` and the Payment row is `pending`.
 */
export async function issueGatewayRefund(bookingId: string, actor: string): Promise<RefundResult> {
  const b = await db.booking.findUnique({ where: { id: bookingId }, include: { payments: true } });
  if (!b) return { ok: false, error: "Booking not found." };
  if (b.status !== "refund_pending") return { ok: false, error: "Only bookings with a pending refund." };

  const captured = b.payments.find((p) => p.kind !== "refund" && p.status === "captured" && p.paymentId && p.provider !== "venue" && p.provider !== "cash" && p.provider !== "manual");
  if (!captured) return { ok: false, error: "No online payment to refund. Refund it by bank or UPI and use Mark refund paid." };
  if (captured.provider === "mock" && process.env.NODE_ENV === "production") return { ok: false, error: "Mock payments cannot be refunded." };

  const amount = b.refundAmount ?? b.advancePaid;
  const requested = b.payments.filter((p) => p.kind === "refund" && p.status !== "failed").reduce((s, p) => s + p.amount, 0);
  const existing = b.payments.find((p) => p.kind === "refund" && p.refundId && !p.refundId.startsWith("manual:") && p.status !== "failed");
  if (existing) return { ok: true, refundId: existing.refundId!, status: existing.status === "refunded" ? "processed" : "pending", already: true };
  if (amount <= 0) return { ok: false, error: "Refund amount is zero." };
  if (requested + amount > captured.amount) return { ok: false, error: "Refund is more than the captured amount." };

  const svc = paymentService();
  let res;
  try {
    res = await svc.refund({ paymentId: captured.paymentId!, amount, receipt: `refund-${b.id}` });
  } catch (e) {
    await audit(null, actor, "refund.gateway_failed", "Booking", b.id, { error: (e as Error).message, amount });
    return { ok: false, error: "The gateway did not accept the refund. Nothing was changed; try again or refund manually." };
  }
  if (res.status === "failed") {
    await audit(null, actor, "refund.gateway_failed", "Booking", b.id, { refundId: res.refundId, amount });
    return { ok: false, error: "The gateway reported the refund as failed." };
  }
  await db.$transaction(async (tx) => {
    await tx.payment.upsert({
      where: { refundId: res.refundId },
      create: { bookingId: b.id, provider: captured.provider, kind: "refund", refundId: res.refundId, amount, status: res.status === "processed" ? "refunded" : "pending", note: `Gateway refund of ${captured.paymentId}` },
      update: {},
    });
    if (res.status === "processed") await tx.booking.update({ where: { id: b.id }, data: { status: "refunded" } });
    await audit(tx, actor, "refund.requested", "Booking", b.id, { refundId: res.refundId, amount, status: res.status });
  });
  return { ok: true, refundId: res.refundId, status: res.status, already: false };
}
