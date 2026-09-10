import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Laptop2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, safeJsonParse } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";
import { generateQrDataUrl, statusUrlFor } from "@/lib/qr";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [job, settings] = await Promise.all([
    prisma.serviceJob.findUnique({
      where: { id },
      include: {
        customer: true,
        device: true,
        estimate: { include: { items: true } },
        payments: true,
        invoice: true,
        warranty: true,
      },
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);
  if (!job) notFound();

  const accessories = safeJsonParse<string[]>(job.accessoriesReceived, []);
  const total = job.invoice?.total ?? job.approvedCost ?? job.estimatedCost ?? 0;
  const paid = job.invoice?.paidAmount ?? job.payments.reduce((s, p) => s + p.amount, 0);
  const pending = job.invoice?.pendingAmount ?? Math.max(0, total - paid);
  const qr = await generateQrDataUrl(statusUrlFor(job.publicToken));

  const lineItems =
    job.estimate && job.estimate.items.length > 0
      ? job.estimate.items
      : [{ id: "labour", type: "SERVICE", description: "Service charges", quantity: 1, unitPrice: total, total }];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href={`/jobs/${job.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
          <ArrowLeft className="size-4" /> Back to job
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-[var(--color-border)] pb-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary-600 text-white">
              <Laptop2 className="size-6" />
            </div>
            <div>
              <p className="text-lg font-bold text-ink-900">{settings?.companyName ?? "RepairFlow Service Center"}</p>
              {settings?.address && <p className="text-xs text-ink-500">{settings.address}</p>}
              <p className="text-xs text-ink-500">
                {[settings?.phone, settings?.email].filter(Boolean).join(" · ")}
              </p>
              {settings?.gstNumber && <p className="text-xs text-ink-500">GSTIN: {settings.gstNumber}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">Invoice</p>
            <p className="text-lg font-bold text-ink-900">{job.invoice?.invoiceNumber ?? "DRAFT"}</p>
            <p className="text-xs text-ink-500">{formatDate(job.invoice?.createdAt ?? job.createdAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6">
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-ink-400 uppercase">Billed To</p>
            <p className="font-semibold text-ink-900">{job.customer.name}</p>
            <p className="text-sm text-ink-500">{job.customer.mobile}</p>
            {job.customer.address && <p className="text-sm text-ink-500">{job.customer.address}</p>}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-ink-400 uppercase">Service Details</p>
            <p className="font-semibold text-ink-900">{job.jobNumber}</p>
            <p className="text-sm text-ink-500">
              {job.device.brand} {job.device.model}
              {job.device.serialNumber ? ` · S/N ${job.device.serialNumber}` : ""}
            </p>
            {accessories.length > 0 && <p className="text-sm text-ink-500">Accessories: {accessories.join(", ")}</p>}
          </div>
        </div>

        <table className="w-full border-t border-[var(--color-border)] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-xs font-semibold tracking-wide text-ink-400 uppercase">
              <th className="py-2">Description</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Unit Price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => (
              <tr key={item.id} className="border-b border-[var(--color-border)]">
                <td className="py-2">{item.description}</td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2">{formatCurrency(item.unitPrice)}</td>
                <td className="py-2 text-right">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end py-4">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-500">Subtotal</span>
              <span>{formatCurrency(job.invoice?.subtotal ?? total)}</span>
            </div>
            {!!job.invoice?.discount && (
              <div className="flex justify-between">
                <span className="text-ink-500">Discount</span>
                <span>-{formatCurrency(job.invoice.discount)}</span>
              </div>
            )}
            {!!job.invoice?.taxAmount && (
              <div className="flex justify-between">
                <span className="text-ink-500">Tax</span>
                <span>{formatCurrency(job.invoice.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[var(--color-border)] pt-1.5 text-base font-bold text-ink-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-success-700">
              <span>Paid</span>
              <span>{formatCurrency(paid)}</span>
            </div>
            <div className="flex justify-between font-semibold text-danger-600">
              <span>Pending</span>
              <span>{formatCurrency(pending)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between border-t border-[var(--color-border)] pt-6">
          <div className="max-w-sm text-xs text-ink-500">
            {job.warranty && (
              <p className="mb-2">
                <span className="font-semibold text-ink-700">Warranty:</span> {job.warranty.periodDays} days
                (until {formatDate(job.warranty.endDate)}). {job.warranty.terms}
              </p>
            )}
            <p>Thank you for choosing {settings?.companyName ?? "us"}. This is a computer-generated invoice.</p>
          </div>
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Scan to check status" className="mx-auto size-24" />
            <p className="mt-1 text-[10px] text-ink-400">Scan for live status</p>
          </div>
        </div>
      </div>
    </div>
  );
}
