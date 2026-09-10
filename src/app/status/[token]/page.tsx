import { notFound } from "next/navigation";
import { Laptop2, Phone, Mail, ShieldCheck, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatusTimeline } from "@/components/jobs/timeline";
import { formatCurrency, formatDate } from "@/lib/utils";
import { JOB_STATUS_CUSTOMER_LABELS, type JobStatus } from "@/lib/constants";

export default async function PublicStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [job, settings] = await Promise.all([
    prisma.serviceJob.findUnique({
      where: { publicToken: token },
      include: {
        customer: { select: { name: true } },
        device: { select: { brand: true, model: true } },
        statusHistory: { orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } },
        payments: { select: { amount: true } },
        warranty: true,
      },
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);

  if (!job) notFound();

  const total = job.approvedCost ?? job.estimatedCost ?? 0;
  const paid = job.payments.reduce((s, p) => s + p.amount, 0);
  const pending = Math.max(0, total - paid);
  const warrantyActive = job.warranty && new Date(job.warranty.endDate) > new Date();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center justify-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Laptop2 className="size-5" />
          </div>
          <span className="text-lg font-bold text-ink-900">{settings?.companyName ?? "RepairFlow Service Center"}</span>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">Service ID</p>
          <p className="text-lg font-bold text-ink-900">{job.jobNumber}</p>
          <p className="mt-1 text-sm text-ink-600">
            {job.customer.name} · {job.device.brand} {job.device.model}
          </p>

          <div className="mt-4 rounded-xl bg-primary-50 p-3 text-center">
            <p className="text-xs font-semibold tracking-wide text-primary-600 uppercase">Current Status</p>
            <p className="mt-0.5 text-xl font-bold text-primary-800">
              {JOB_STATUS_CUSTOMER_LABELS[job.status as JobStatus] ?? job.status}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="mb-4 text-sm font-semibold text-ink-900">Progress</p>
          <StatusTimeline history={job.statusHistory} currentStatus={job.status} customerFacing />
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="mb-3 text-sm font-semibold text-ink-900">Payment Summary</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-500">Expected Completion</span>
              <span className="font-medium text-ink-900">{formatDate(job.expectedCompletionDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Approved Estimate</span>
              <span className="font-medium text-ink-900">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Amount Paid</span>
              <span className="font-medium text-success-600">{formatCurrency(paid)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--color-border)] pt-2 font-semibold">
              <span className="text-ink-700">Amount Pending</span>
              <span className={pending > 0 ? "text-danger-600" : "text-success-600"}>{formatCurrency(pending)}</span>
            </div>
          </div>
        </div>

        {job.warranty && (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
            {warrantyActive ? (
              <ShieldCheck className="size-8 shrink-0 text-success-600" />
            ) : (
              <ShieldAlert className="size-8 shrink-0 text-ink-400" />
            )}
            <div>
              <p className="text-sm font-semibold text-ink-900">
                {warrantyActive ? "Warranty Active" : "Warranty Expired"}
              </p>
              <p className="text-xs text-ink-500">Valid until {formatDate(job.warranty.endDate)}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 text-center shadow-[var(--shadow-card)]">
          <p className="mb-2 text-sm font-semibold text-ink-900">Need help?</p>
          <div className="flex flex-col items-center gap-1 text-sm text-ink-600">
            {settings?.phone && (
              <p className="flex items-center gap-1.5">
                <Phone className="size-3.5" /> {settings.phone}
              </p>
            )}
            {settings?.email && (
              <p className="flex items-center gap-1.5">
                <Mail className="size-3.5" /> {settings.email}
              </p>
            )}
          </div>
        </div>

        <p className="pb-4 text-center text-xs text-ink-400">We keep you updated at every step.</p>
      </div>
    </div>
  );
}
