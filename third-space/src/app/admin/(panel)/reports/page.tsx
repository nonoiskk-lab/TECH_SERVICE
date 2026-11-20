import { db } from "@/server/db";
import { requireRole } from "@/server/admin/auth";
import { dashboardMetrics } from "@/server/admin/metrics";
import { formatINR } from "@/lib/pricing";
import { toIstIso } from "@/server/slots/time";
import { Card, H1 } from "@/components/admin/ui";

export default async function ReportsPage() {
  await requireRole("reports");
  const [m, pays, bookings] = await Promise.all([
    dashboardMetrics(),
    db.payment.findMany({ where: { status: { in: ["captured", "refunded"] } }, include: { booking: { select: { packageName: true, packageId: true, resource: true } } } }),
    db.booking.findMany({ select: { status: true, packageName: true, packageId: true, resource: true, createdAt: true } }),
  ]);
  const byMonth = new Map<string, { gross: number; refunds: number }>();
  const byPackage = new Map<string, number>();
  for (const p of pays) {
    const k = toIstIso(p.createdAt).slice(0, 7);
    const e = byMonth.get(k) ?? { gross: 0, refunds: 0 };
    if (p.kind === "refund") e.refunds += p.amount;
    else {
      e.gross += p.amount;
      const name = p.booking.packageName || p.booking.packageId;
      byPackage.set(name, (byPackage.get(name) ?? 0) + p.amount);
    }
    byMonth.set(k, e);
  }
  const statusCounts = new Map<string, number>();
  for (const b of bookings) statusCounts.set(b.status, (statusCounts.get(b.status) ?? 0) + 1);
  const maxPkg = Math.max(1, ...byPackage.values());
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <H1>Reports</H1>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from a route handler */}
        <a href="/admin/export/revenue" className="ts-btn ts-btn-ghost text-sm">
          Export revenue CSV
        </a>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Revenue by month (collected − refunded)" testId="revenue-month">
          <table className="w-full text-sm">
            <thead className="text-faint">
              <tr>
                <th className="py-1 text-left">Month</th>
                <th className="py-1 text-right">Collected</th>
                <th className="py-1 text-right">Refunded</th>
                <th className="py-1 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {[...byMonth.entries()].sort().reverse().map(([k, e]) => (
                <tr key={k} className="border-t border-line/60">
                  <td className="py-1">{k}</td>
                  <td className="py-1 text-right">{formatINR(e.gross)}</td>
                  <td className="py-1 text-right">{formatINR(e.refunds)}</td>
                  <td className="py-1 text-right font-semibold">{formatINR(e.gross - e.refunds)}</td>
                </tr>
              ))}
              {byMonth.size === 0 && (
                <tr>
                  <td colSpan={4} className="py-2 text-muted">
                    No payments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
        <Card title="Collected by package">
          <ul className="space-y-2 text-sm">
            {[...byPackage.entries()].sort((a, b) => b[1] - a[1]).map(([name, v]) => (
              <li key={name}>
                <div className="flex justify-between">
                  <span>{name}</span>
                  <span>{formatINR(v)}</span>
                </div>
                <div className="mt-1 h-2 rounded bg-raised">
                  <div className="h-2 rounded bg-gold" style={{ width: `${Math.round((v / maxPkg) * 100)}%` }} />
                </div>
              </li>
            ))}
            {byPackage.size === 0 && <li className="text-muted">No payments yet.</li>}
          </ul>
        </Card>
        <Card title="Utilisation, next 7 days">
          <p className="text-sm">Private Theatre: {m.theatreUtil}% · Studio: {m.studioUtil}% of open hours booked.</p>
        </Card>
        <Card title="Bookings by status (all time)">
          <ul className="grid grid-cols-2 gap-1 text-sm">
            {[...statusCounts.entries()].map(([s, n]) => (
              <li key={s}>
                {s.replace("_", " ")}: <strong>{n}</strong>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">This month: {m.bookingsMonth} bookings, {m.cancelledMonth} cancelled ({m.cancellationRate}%).</p>
        </Card>
      </div>
    </>
  );
}
