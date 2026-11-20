import Link from "next/link";
import { db } from "@/server/db";
import { requireRole } from "@/server/admin/auth";
import { formatINR } from "@/lib/pricing";
import { Card, fmtDateTime, H1, minutesAgo, Status } from "@/components/admin/ui";

export default async function PaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  await requireRole("payments");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const [rows, refundsDue, stale] = await Promise.all([
    db.payment.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: 300 }),
    db.booking.findMany({ where: { status: "refund_pending" }, orderBy: { cancelledAt: "desc" } }),
    db.payment.count({ where: { status: "created", createdAt: { lt: minutesAgo(30) } } }),
  ]);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <H1>Payments</H1>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from a route handler */}
        <a href="/admin/export/payments" className="ts-btn ts-btn-ghost text-sm">
          Export CSV
        </a>
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card title="Transactions">
          <form className="mb-3 flex gap-2">
            <select name="status" defaultValue={status} className="ts-input w-44" aria-label="Status">
              {["", "created", "captured", "pending", "failed", "refunded"].map((s) => (
                <option key={s} value={s}>
                  {s || "Any status"}
                </option>
              ))}
            </select>
            <button className="ts-btn ts-btn-ghost text-sm">Filter</button>
          </form>
          <ul className="divide-y divide-line/60 text-sm" data-testid="payment-rows">
            {rows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <Link href={`/admin/bookings/${p.bookingId}`} className="underline">
                    {p.bookingId}
                  </Link>{" "}
                  · {p.kind} · {p.provider} {p.paymentId ?? p.orderId ?? ""} · {fmtDateTime(p.createdAt)}
                </span>
                <span className="flex items-center gap-2">
                  {p.kind === "refund" ? "−" : ""}
                  {formatINR(p.amount)} <Status value={p.status} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <div className="space-y-4">
          <Card title="Refunds to pay" testId="refunds-due">
            {refundsDue.length === 0 && <p className="text-sm text-muted">None.</p>}
            <ul className="space-y-1 text-sm">
              {refundsDue.map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/bookings/${b.id}`} className="underline">
                    {b.id}
                  </Link>{" "}
                  · {formatINR(b.refundAmount ?? b.advancePaid)} · {b.cancelReason}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Reconciliation">
            <p className="text-sm text-muted">
              Orders created more than 30 minutes ago and never paid: <strong>{stale}</strong>. They are released by the scheduled job. Compare captured
              payments here with the Razorpay settlement report each week (export CSV).
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
