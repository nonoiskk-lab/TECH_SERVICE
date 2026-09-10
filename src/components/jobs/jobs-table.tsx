import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/ui/misc";
import { formatCurrency, formatDate } from "@/lib/utils";

export type JobRow = {
  id: string;
  jobNumber: string;
  status: string;
  priority: string;
  estimatedCost: number | null;
  approvedCost: number | null;
  expectedCompletionDate: Date | string | null;
  createdAt: Date | string;
  customer: { name: string; mobile: string };
  device: { brand: string; model: string };
  assignedTechnician: { name: string } | null;
};

const priorityDot: Record<string, string> = {
  LOW: "bg-ink-300",
  NORMAL: "bg-info-600",
  HIGH: "bg-warning-600",
  URGENT: "bg-danger-600",
};

// Below `sm` a horizontally-scrolling table hides the columns that matter
// most (status, amount) off-screen, so mobile gets a stacked card list
// instead — no horizontal scroll needed to see what matters.
export function JobsTable({ jobs, emptyMessage }: { jobs: JobRow[]; emptyMessage?: string }) {
  if (jobs.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-ink-500">{emptyMessage ?? "No service jobs found."}</div>
    );
  }

  return (
    <>
      <div className="divide-y divide-[var(--color-border)] sm:hidden">
        {jobs.map((job) => (
          <Link key={job.id} href={`/jobs/${job.id}`} className="block p-4 active:bg-ink-50">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-semibold text-primary-700">
                <span className={`size-1.5 rounded-full ${priorityDot[job.priority] ?? priorityDot.NORMAL}`} />
                {job.jobNumber}
              </span>
              <StatusBadge status={job.status} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Avatar name={job.customer.name} className="size-7 text-[10px]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">{job.customer.name}</p>
                <p className="truncate text-xs text-ink-500">
                  {job.device.brand} {job.device.model}
                </p>
              </div>
              <span className="ml-auto shrink-0 text-sm font-semibold text-ink-900">
                {formatCurrency(job.approvedCost ?? job.estimatedCost)}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-x-auto scroll-thin sm:block">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-xs font-semibold tracking-wide text-ink-400 uppercase">
              <th className="px-4 py-3 font-semibold">Job</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Device</th>
              <th className="px-4 py-3 font-semibold">Technician</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Expected</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-ink-50/70">
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link href={`/jobs/${job.id}`} className="flex items-center gap-2 font-semibold text-primary-700 hover:underline">
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${priorityDot[job.priority] ?? priorityDot.NORMAL}`}
                      title={`Priority: ${job.priority}`}
                    />
                    {job.jobNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={job.customer.name} className="size-7 shrink-0 text-[10px]" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">{job.customer.name}</p>
                      <p className="truncate text-xs text-ink-500">{job.customer.mobile}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-700">
                  {job.device.brand} {job.device.model}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-700">{job.assignedTechnician?.name ?? "Unassigned"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-medium text-ink-900">
                  {formatCurrency(job.approvedCost ?? job.estimatedCost)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-500">{formatDate(job.expectedCompletionDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
