import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
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
  { key: "NEW", label: JOB_STATUS_LABELS.NEW, statuses: ["NEW"] },
  { key: "DIAGNOSIS", label: JOB_STATUS_LABELS.DIAGNOSIS, statuses: ["DIAGNOSIS"] },
  { key: "WAITING_APPROVAL", label: "Approval", statuses: ["WAITING_APPROVAL"] },
  { key: "REPAIR_IN_PROGRESS", label: "In Repair", statuses: ["REPAIR_IN_PROGRESS"] },
  { key: "WAITING_FOR_PARTS", label: "Waiting Parts", statuses: ["WAITING_FOR_PARTS", "PARTS_REQUIRED"] },
  { key: "READY_FOR_DELIVERY", label: "Ready", statuses: ["READY_FOR_DELIVERY"] },
  { key: "DELIVERED", label: "Delivered", statuses: ["DELIVERED", "CLOSED"] },
  { key: "EXCEPTIONS", label: "Exceptions", statuses: ["ON_HOLD", "CANCELLED", "UNREPAIRABLE", "CUSTOMER_DECLINED"] },
];

const TERMINAL_EXCLUDE: JobStatus[] = ["CLOSED", "CANCELLED", "UNREPAIRABLE", "CUSTOMER_DECLINED", "DELIVERED"];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; tab?: string }>;
}) {
  const { q, status: statusParam, tab: tabParam } = await searchParams;

  let tab = tabParam ?? "ALL";
  if (statusParam && !tabParam) {
    const found = TAB_GROUPS.find((t) => t.statuses?.includes(statusParam as JobStatus));
    tab = found?.key ?? "ALL";
  }
  const activeGroup = TAB_GROUPS.find((t) => t.key === tab) ?? TAB_GROUPS[0];

  const where: Prisma.ServiceJobWhereInput = {};
  if (activeGroup.statuses) {
    where.status = { in: activeGroup.statuses };
  } else {
    where.status = { notIn: TERMINAL_EXCLUDE };
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
          where: g.statuses ? { status: { in: g.statuses } } : { status: { notIn: TERMINAL_EXCLUDE } },
        })
      )
    ),
  ]);

  return (
    <div>
      <SectionHeading
        title="Service Jobs"
        description="Every repair job from intake to delivery."
        action={
          <Link href="/jobs/new">
            <Button>
              <Plus className="size-4" /> New Service Job
            </Button>
          </Link>
        }
      />

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

      <form className="mb-4 max-w-sm" action="/jobs">
        <input type="hidden" name="tab" value={tab} />
        <Input name="q" defaultValue={q ?? ""} placeholder="Search by job ID, customer, mobile, model, serial…" />
      </form>

      <Card>
        {jobs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Wrench}
              title="No service jobs in this view"
              description="Try a different tab or search term, or create a new job."
              action={
                <Link href="/jobs/new">
                  <Button variant="outline">
                    <Plus className="size-4" /> New Service Job
                  </Button>
                </Link>
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
