import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SectionHeading, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function PaymentsPage() {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { receivedBy: true, job: { include: { customer: true, device: true } } },
  });

  const totalToday = payments
    .filter((p) => p.createdAt.toDateString() === new Date().toDateString())
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <SectionHeading
        title="Payments"
        description={`All payments received across every job. Today: ${formatCurrency(totalToday)}`}
        action={
          <Link href="/payments/new">
            <Button>
              <Plus className="size-4" /> Receive Payment
            </Button>
          </Link>
        }
      />

      <Card>
        {payments.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Wallet} title="No payments recorded yet" description="Record a payment when a customer pays advance or final amounts." />
          </div>
        ) : (
          <>
            <div className="divide-y divide-[var(--color-border)] sm:hidden">
              {payments.map((p) => (
                <Link key={p.id} href={`/jobs/${p.jobId}`} className="flex items-center justify-between gap-3 p-4 active:bg-ink-50">
                  <div className="min-w-0">
                    <p className="font-medium text-primary-700">{p.job.jobNumber}</p>
                    <p className="truncate text-xs text-ink-500">
                      {p.job.customer.name} · {formatDateTime(p.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-ink-900">{formatCurrency(p.amount)}</p>
                    <Badge tone="neutral">{p.type}</Badge>
                  </div>
                </Link>
              ))}
            </div>
            <div className="hidden overflow-x-auto scroll-thin sm:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs font-semibold tracking-wide text-ink-400 uppercase">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Received By</th>
                  <th className="px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-ink-50/70">
                    <td className="px-4 py-3 text-ink-600">{formatDateTime(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/jobs/${p.jobId}`} className="font-medium text-primary-700 hover:underline">
                        {p.job.jobNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{p.job.customer.name}</td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{p.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{p.method.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3 text-ink-500">{p.receivedBy.name}</td>
                    <td className="px-4 py-3 font-semibold text-ink-900">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
