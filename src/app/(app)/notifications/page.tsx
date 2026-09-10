import Link from "next/link";
import { AlertTriangle, PackageX, Wallet, Clock3, ShieldAlert, Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getLiveAlerts } from "@/lib/live-notifications";
import { SectionHeading, EmptyState } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";

const ALERT_ICON = {
  LOW_STOCK: PackageX,
  PAYMENT_PENDING: Wallet,
  JOB_DELAYED: Clock3,
  WARRANTY_EXPIRING: ShieldAlert,
} as const;

export default async function NotificationsPage() {
  const [notifications, liveAlerts] = await Promise.all([
    prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    getLiveAlerts(),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeading title="Notifications" description="Live alerts plus a feed of everything that's happened recently." />

      <Card>
        <CardHeader title="Live Alerts" description="Recomputed in real time — always current" />
        <CardBody className="space-y-2">
          {liveAlerts.length === 0 && <p className="text-sm text-ink-500">No active alerts. Everything looks healthy.</p>}
          {liveAlerts.map((a) => {
            const Icon = ALERT_ICON[a.type];
            return (
              <Link
                key={a.id}
                href={a.href ?? "#"}
                className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] p-3 hover:border-primary-300"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning-50 text-warning-600">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-900">{a.title}</p>
                  <p className="text-xs text-ink-500">{a.message}</p>
                </div>
              </Link>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Activity Feed" />
        {notifications.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Bell} title="No activity yet" description="New jobs, approvals and deliveries will show up here." />
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {notifications.map((n) => (
              <Link
                key={n.id}
                href={n.jobId ? `/jobs/${n.jobId}` : "#"}
                className={`flex items-start gap-3 p-4 hover:bg-ink-50/70 ${n.isRead ? "" : "bg-primary-50/30"}`}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <AlertTriangle className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                  <p className="text-sm text-ink-600">{n.message}</p>
                  <p className="mt-1 text-xs text-ink-400">{formatRelativeTime(n.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
