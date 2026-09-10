import { History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SectionHeading, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, safeJsonParse } from "@/lib/utils";

export default async function AuditLogPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: true },
  });

  return (
    <div>
      <SectionHeading title="Audit Log" description="Every important change made across the system, never silently overwritten." />

      <Card>
        {logs.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={History} title="No activity yet" description="Status changes, estimate updates and other key actions will appear here." />
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {logs.map((log) => {
              const before = safeJsonParse<Record<string, unknown>>(log.beforeJson, {});
              const after = safeJsonParse<Record<string, unknown>>(log.afterJson, {});
              return (
                <div key={log.id} className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm text-ink-900">
                      <span className="font-semibold">{log.actor.name}</span> — <Badge tone="neutral">{log.action.replaceAll("_", " ")}</Badge>{" "}
                      on {log.entityType}
                    </p>
                    {Object.keys(before).length > 0 || Object.keys(after).length > 0 ? (
                      <p className="mt-1 text-xs text-ink-500">
                        {Object.entries(after)
                          .map(([k, v]) => `${k}: ${before[k] ?? "—"} → ${v}`)
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs text-ink-400">{formatDateTime(log.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
