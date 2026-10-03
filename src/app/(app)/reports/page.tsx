import Link from "next/link";
import { SectionHeading } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { getServiceReport, getFinancialReport, getInventoryReport, getTechnicianReport } from "@/lib/reports";

const TABS = [
  { key: "service", label: "Service" },
  { key: "financial", label: "Financial" },
  { key: "inventory", label: "Inventory" },
  { key: "technician", label: "Technician" },
] as const;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam! : "service";

  return (
    <div>
      <SectionHeading title="Reports" description="Service, financial, inventory and technician performance." />

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/reports?tab=${t.key}`}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium",
              tab === t.key ? "border-primary-200 bg-primary-50 text-primary-700" : "border-[var(--color-border)] bg-white text-ink-600 hover:bg-ink-50"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "service" && <ServiceReportSection />}
      {tab === "financial" && <FinancialReportSection />}
      {tab === "inventory" && <InventoryReportSection />}
      {tab === "technician" && <TechnicianReportSection />}
    </div>
  );
}

async function ServiceReportSection() {
  const r = await getServiceReport();
  const stats = [
    { label: "Jobs Today", value: r.dailyJobs },
    { label: "Jobs This Month", value: r.monthlyJobs },
    { label: "Completed (This Month)", value: r.completedThisMonth },
    { label: "Completed (All Time)", value: r.completedAll },
    { label: "Pending Jobs", value: r.pendingJobs },
    { label: "Delayed Jobs", value: r.delayedJobs, danger: r.delayedJobs > 0 },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="p-4">
          <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{s.label}</p>
          <p className={cn("mt-1.5 text-2xl font-bold", s.danger ? "text-danger-600" : "text-ink-900")}>{s.value}</p>
        </Card>
      ))}
    </div>
  );
}

async function FinancialReportSection() {
  const r = await getFinancialReport();
  const stats = [
    { label: "Revenue Today", value: formatCurrency(r.revenueToday) },
    { label: "Revenue This Month", value: formatCurrency(r.revenueMonth) },
    { label: "Revenue All Time", value: formatCurrency(r.revenueAll) },
    { label: "Labour Revenue", value: formatCurrency(r.labourRevenue) },
    { label: "Parts Revenue", value: formatCurrency(r.partsRevenue) },
    { label: "Outstanding Payments", value: formatCurrency(r.outstandingPayments), danger: r.outstandingPayments > 0 },
    { label: "Inventory Expenses", value: formatCurrency(r.expenses) },
    { label: "Estimated Profit", value: formatCurrency(r.profit), success: r.profit >= 0 },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="p-4">
          <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{s.label}</p>
          <p className={cn("mt-1.5 text-2xl font-bold", s.danger ? "text-danger-600" : s.success ? "text-success-600" : "text-ink-900")}>
            {s.value}
          </p>
        </Card>
      ))}
    </div>
  );
}

async function InventoryReportSection() {
  const r = await getInventoryReport();
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Total Stock Value</p>
          <p className="mt-1.5 text-2xl font-bold text-ink-900">{formatCurrency(r.stockValue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Low Stock Items</p>
          <p className="mt-1.5 text-2xl font-bold text-danger-600">{r.lowStock.length}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Fast Moving Parts" description="Most used in service jobs" />
          <CardBody className="space-y-2">
            {r.fastMoving.length === 0 && <p className="text-sm text-ink-500">Not enough usage data yet.</p>}
            {r.fastMoving.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <Link href={`/inventory/${p.id}`} className="text-primary-700 hover:underline">
                  {p.name}
                </Link>
                <Badge tone="info">{p.used} used</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Slow Moving Parts" description="Never used in a service job" />
          <CardBody className="space-y-2">
            {r.slowMoving.length === 0 && <p className="text-sm text-ink-500">All parts have some usage.</p>}
            {r.slowMoving.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <Link href={`/inventory/${p.id}`} className="text-primary-700 hover:underline">
                  {p.name}
                </Link>
                <Badge tone="neutral">{p.quantity} in stock</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent Purchase History" />
        <CardBody className="space-y-2">
          {r.recentPurchases.map((po) => (
            <Link key={po.id} href={`/purchases/${po.id}`} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3 hover:border-primary-300">
              <div>
                <p className="text-sm font-semibold text-ink-900">{po.poNumber}</p>
                <p className="text-xs text-ink-500">{po.supplier.name} · {formatDate(po.orderDate)}</p>
              </div>
              <p className="text-sm font-bold text-ink-900">{formatCurrency(po.totalAmount)}</p>
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

async function TechnicianReportSection() {
  const technicians = await getTechnicianReport();
  return (
    <Card>
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-xs font-semibold tracking-wide text-ink-400 uppercase">
              <th className="px-4 py-3">Technician</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3">Pending</th>
              <th className="px-4 py-3">Avg. Completion Time</th>
            </tr>
          </thead>
          <tbody>
            {technicians.map((t) => (
              <tr key={t.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="px-4 py-3 font-medium text-ink-900">{t.name}</td>
                <td className="px-4 py-3 text-ink-600">{t.assigned}</td>
                <td className="px-4 py-3 text-ink-600">{t.completed}</td>
                <td className="px-4 py-3 text-ink-600">{t.pending}</td>
                <td className="px-4 py-3 text-ink-600">{t.avgDays > 0 ? `${t.avgDays.toFixed(1)} days` : "—"}</td>
              </tr>
            ))}
            {technicians.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-ink-500">
                  No technicians yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
