import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canDeleteRecords } from "@/lib/permissions";
import { SectionHeading, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { JobsTable } from "@/components/jobs/jobs-table";
import { cn } from "@/lib/utils";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

const TAB_GROUPS: { key: string; label: string; statuses?: JobStatus[] }[] = [
  { key: "ALL", label: "All Active" },
  { key: "RECEIVED", label: JOB_STATUS_LABELS.RECEIVED, statuses: ["RECEIVED"] },
  { key: "REPAIR_IN_PROGRESS", label: JOB_STATUS_LABELS.REPAIR_IN_PROGRESS, statuses: ["REPAIR_IN_PROGRESS"] },
  { key: "DELIVERED", label: JOB_STATUS_LABELS.DELIVERED, statuses: ["DELIVERED"] },
  { key: "CLOSED", label: JOB_STATUS_LABELS.CLOSED, statuses: ["CLOSED"] },
];

const TERMINAL_EXCLUDE: JobStatus[] = ["CLOSED"];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; tab?: string; archived?: string }>;
}) {
  const { q, status: statusParam, tab: tabParam, archived } = await searchParams;
  const session = await getSession();
  const canDelete = canDeleteRecords(session?.role ?? "FRONT_DESK");
  const showArchived = archived === "true";

  let tab = tabParam ?? "ALL";
  if (statusParam && !tabParam) {
    const found = TAB_GROUPS.find((t) => t.statuses?.includes(statusParam as JobStatus));
    tab = found?.key ?? "ALL";
  }
  const activeGroup = TAB_GROUPS.find((t) => t.key === tab) ?? TAB_GROUPS[0];

  const where: Prisma.ServiceJobWhereInput = { isArchived: showArchived };
  if (!showArchived) {
    if (activeGroup.statuses) {
      where.status = { in: activeGroup.statuses };
    } else {
      where.status = { notIn: TERMINAL_EXCLUDE };
    }
  }
  if (q) {
    where.OR = [
      { jobNumber: { contains: q } },
      { customer: { name: { contains: q } } },
      { customer: { mobile: { contains: q } } },
      { device: { brand: { contains: q } } },
      { device: { model: { contains: q } } },
      { device: { serialNumber: { contains: q } } },
    ];
  }

  const [jobs, counts] = await Promise.all([
    prisma.serviceJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { customer: true, device: true, assignedTechnician: true },
    }),
    Promise.all(
      TAB_GROUPS.map((g) =>
        prisma.serviceJob.count({
          where: {
            isArchived: false,
            ...(g.statuses ? { status: { in: g.statuses } } : { status: { notIn: TERMINAL_EXCLUDE } }),
          },
        })
      )
    ),
  ]);

  return (
    <div>
      <SectionHeading
        title="Service Jobs"
        description={showArchived ? "Deleted jobs — restore any of these to bring them back." : "Every repair job from intake to delivery."}
        action={
          <Link href="/jobs/new">
            <Button>
              <Plus className="size-4" /> New Service Job
            </Button>
          </Link>
        }
      />

      {!showArchived && (
        <div className="mb-4 flex flex-wrap gap-2">
          {TAB_GROUPS.map((g, i) => (
            <Link
              key={g.key}
              href={`/jobs?tab=${g.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                tab === g.key
                  ? "border-primary-200 bg-primary-50 text-primary-700"
                  : "border-[var(--color-border)] bg-white text-ink-600 hover:bg-ink-50"
              )}
            >
              {g.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  tab === g.key ? "bg-primary-100" : "bg-ink-100 text-ink-500"
                )}
              >
                {counts[i]}
              </span>
            </Link>
          ))}
        </div>
      )}

      <form className="mb-4 flex flex-wrap gap-2" action="/jobs">
        <input type="hidden" name="tab" value={tab} />
        <Input name="q" defaultValue={q ?? ""} placeholder="Search by job ID, customer, mobile, model, serial…" className="max-w-sm" />
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {canDelete && (
          <Link href={showArchived ? "/jobs" : "/jobs?archived=true"} className="ml-auto">
            <Button type="button" variant="ghost">
              {showArchived ? "Back to active jobs" : "Deleted jobs"}
            </Button>
          </Link>
        )}
      </form>

      <Card>
        {jobs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Wrench}
              title={showArchived ? "No deleted jobs" : "No service jobs in this view"}
              description={showArchived ? "Nothing has been deleted yet." : "Try a different tab or search term, or create a new job."}
              action={
                showArchived ? undefined : (
                  <Link href="/jobs/new">
                    <Button variant="outline">
                      <Plus className="size-4" /> New Service Job
                    </Button>
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <JobsTable jobs={jobs} />
        )}
      </Card>
    </div>
  );
}
