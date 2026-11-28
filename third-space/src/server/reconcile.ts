import "server-only";
import { db } from "./db";
import { audit } from "./audit";
import { paymentService } from "./payments";
import { confirmPayment } from "./slots";
import { notifyBooking } from "./notify";

export type ReconcileReport = { checked: number; confirmed: number; failed: number; mismatched: number; errors: number };

/**
 * Safety net for a missed webhook or a guest who never returned from checkout.
 * Looks at Razorpay orders that are still `created` after `minAgeMinutes` (but not older than
 * `maxAgeHours`) and asks the gateway what actually happened:
 *  - a captured payment of the exact amount (paise) and INR  -> confirm the booking (idempotent)
 *  - a captured payment of another amount                    -> audit, nothing confirmed
 *  - only failed payments                                     -> mark the payment failed
 *  - nothing / still open                                     -> leave it (the hold expiry handles it)
 */
export async function reconcilePayments(opts: { minAgeMinutes?: number; maxAgeHours?: number; now?: Date } = {}): Promise<ReconcileReport> {
  const now = opts.now ?? new Date();
  const report: ReconcileReport = { checked: 0, confirmed: 0, failed: 0, mismatched: 0, errors: 0 };
  const svc = paymentService();
  if (svc.provider !== "razorpay") return report;

  const rows = await db.payment.findMany({
    where: {
      provider: "razorpay",
      status: "created",
      orderId: { not: null },
      createdAt: { lt: new Date(now.getTime() - (opts.minAgeMinutes ?? 10) * 60_000), gt: new Date(now.getTime() - (opts.maxAgeHours ?? 48) * 3600_000) },
    },
    take: 200,
    orderBy: { createdAt: "asc" },
  });

  for (const row of rows) {
    report.checked++;
    try {
      const list = await svc.listOrderPayments(row.orderId!);
      const captured = list.find((p) => p.status === "captured");
      if (captured) {
        if (captured.amount !== row.amount || captured.currency !== "INR") {
          report.mismatched++;
          await audit(null, "reconciliation", "payment.amount_mismatch", "Booking", row.bookingId, { orderId: row.orderId, expected: row.amount, got: captured.amount, currency: captured.currency });
          continue;
        }
        const r = await confirmPayment(row.orderId!, captured.id, "reconciliation", { amount: captured.amount, currency: captured.currency });
        if (r.state === "confirmed" || r.state === "refund_pending") {
          if (r.fresh) {
            report.confirmed++;
            await audit(null, "reconciliation", "payment.recovered", "Booking", r.bookingId, { orderId: row.orderId, paymentId: captured.id });
            await notifyBooking(r.bookingId, r.state === "confirmed" ? "payment_received" : "payment_issue");
          }
        }
      } else if (list.length > 0 && list.every((p) => p.status === "failed")) {
        await db.payment.updateMany({ where: { id: row.id, status: "created" }, data: { status: "failed", note: "Gateway reports every attempt failed" } });
        report.failed++;
      }
    } catch (e) {
      report.errors++;
      console.error("reconcile failed for", row.orderId, (e as Error).message);
    }
  }
  return report;
}
