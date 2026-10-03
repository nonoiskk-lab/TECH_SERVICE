import Link from "next/link";
import {
  Plus,
  UserPlus,
  Wallet,
  ShoppingCart,
  FileSearch,
  PackagePlus,
  Inbox,
  Wrench,
  PackageSearch,
  CheckCircle2,
  Clock3,
  IndianRupee,
  AlertTriangle,
  TimerReset,
  Users2,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { canSeeFinancials } from "@/lib/permissions";
import { StatCard } from "@/components/stat-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobsTable } from "@/components/jobs/jobs-table";
import { RevenueTrendChart } from "@/components/charts/revenue-trend-chart";
import { formatCurrency } from "@/lib/utils";
import type { Role } from "@/lib/constants";

export default async function DashboardPage() {
  const session = await getSession();
  const role = (session?.role ?? "FRONT_DESK") as Role;
  const showFinancials = canSeeFinancials(role);
  const data = await getDashboardData();
  const s = data.statusCounts;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
            Welcome back, {session?.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-ink-500">Here&rsquo;s what&rsquo;s happening across the service center today.</p>
        </div>
        <QuickActions />
      </div>

      {/* Today's overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Received" value={s.received} icon={Inbox} tone="info" href="/jobs?status=RECEIVED" />
        <StatCard label="Repair In Progress" value={s.repair} icon={Wrench} tone="info" href="/jobs?status=REPAIR_IN_PROGRESS" />
        <StatCard label="Delivered" value={s.delivered} icon={CheckCircle2} tone="success" href="/jobs?status=DELIVERED" />
        <StatCard label="Completed" value={s.closed} icon={PackageSearch} tone="success" href="/jobs?status=CLOSED" />
        <StatCard label="Delivered Today" value={s.deliveredToday} icon={Clock3} tone="success" />
        {showFinancials && (
          <StatCard label="Pending ₹" value={formatCurrency(s.pendingAmount)} icon={IndianRupee} tone="danger" href="/payments" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {showFinancials && (
          <Card className="xl:col-span-2">
            <CardHeader
              title="Revenue Overview"
              description="Payments collected over the last 7 days"
              action={
                <div className="flex gap-4 text-right text-sm">
                  <div>
                    <p className="text-xs text-ink-500">Today</p>
                    <p className="font-semibold text-ink-900">{formatCurrency(data.revenue.today)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">This Week</p>
                    <p className="font-semibold text-ink-900">{formatCurrency(data.revenue.week)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">This Month</p>
                    <p className="font-semibold text-ink-900">{formatCurrency(data.revenue.month)}</p>
                  </div>
                </div>
              }
            />
            <CardBody>
              <RevenueTrendChart data={data.revenueTrend} />
            </CardBody>
          </Card>
        )}

        <Card className={showFinancials ? "" : "xl:col-span-2"}>
          <CardHeader title="Service Performance" description="This month" />
          <CardBody className="space-y-4">
            <PerformanceRow icon={TimerReset} label="Average Repair Time" value={`${data.performance.avgRepairDays.toFixed(1)} days`} />
            <PerformanceRow icon={CheckCircle2} label="Jobs Completed" value={data.performance.completedThisMonth} />
            <PerformanceRow icon={Inbox} label="Jobs Pending" value={data.performance.pendingJobs} />
            <PerformanceRow
              icon={AlertTriangle}
              label="Delayed Jobs"
              value={data.performance.delayedJobs}
              tone={data.performance.delayedJobs > 0 ? "text-danger-600" : undefined}
            />
            <div className="border-t border-[var(--color-border)] pt-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-400 uppercase">
                <Users2 className="size-3.5" /> Technician Load
              </p>
              <div className="space-y-2">
                {data.performance.technicians.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink-700">{t.name}</span>
                    <span className="flex items-center gap-1.5">
                      <Badge tone={t.active > 3 ? "warning" : "neutral"}>{t.active} active</Badge>
                    </span>
                  </div>
                ))}
                {data.performance.technicians.length === 0 && (
                  <p className="text-sm text-ink-400">No technicians yet.</p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent Service Jobs"
            description="The latest jobs across the whole team"
            action={
              <Link href="/jobs" className="text-sm font-medium text-primary-600 hover:underline">
                View all
              </Link>
            }
          />
          <div className="mt-4">
            <JobsTable jobs={data.recentJobs} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Low Stock Alerts"
            description="Parts that need reordering"
            action={
              <Link href="/inventory" className="text-sm font-medium text-primary-600 hover:underline">
                View inventory
              </Link>
            }
          />
          <CardBody className="space-y-3">
            {data.lowStock.length === 0 && <p className="text-sm text-ink-500">All stock levels are healthy.</p>}
            {data.lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{p.name}</p>
                  <p className="text-xs text-ink-500">{p.quantity} left · min {p.minStock}</p>
                </div>
                <Badge tone={p.level === "OUT_OF_STOCK" ? "danger" : p.level === "CRITICAL" ? "danger" : "warning"}>
                  {p.level.replaceAll("_", " ")}
                </Badge>
              </div>
            ))}
            {data.lowStock.length > 0 && (
              <Link href="/purchases/new">
                <button className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary-300 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50">
                  <PackagePlus className="size-4" /> Create Purchase Request
                </button>
              </Link>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function PerformanceRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-ink-600">
        <Icon className="size-4 text-ink-400" />
        {label}
      </span>
      <span className={`text-sm font-semibold ${tone ?? "text-ink-900"}`}>{value}</span>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { href: "/jobs/new", label: "New Service Job", icon: Plus },
    { href: "/customers/new", label: "New Customer", icon: UserPlus },
    { href: "/payments/new", label: "Receive Payment", icon: Wallet },
    { href: "/purchases/new", label: "Add Purchase", icon: ShoppingCart },
    { href: "/jobs", label: "Search Job", icon: FileSearch },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-ink-700 shadow-sm hover:border-primary-300 hover:text-primary-700"
        >
          <a.icon className="size-4" />
          {a.label}
        </Link>
      ))}
    </div>
  );
}
