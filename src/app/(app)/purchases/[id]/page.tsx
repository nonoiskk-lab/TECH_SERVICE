import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PurchaseOrderActions } from "@/components/inventory/purchase-order-actions";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, items: { include: { part: true } }, createdBy: true },
  });
  if (!po) notFound();

  return (
    <div className="space-y-5">
      <Link href="/purchases" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="size-4" /> Back to purchases
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">{po.poNumber}</h1>
          <Badge tone={po.status === "RECEIVED" ? "success" : po.status === "CANCELLED" ? "danger" : "info"}>{po.status}</Badge>
          <Badge tone={po.paymentStatus === "PAID" ? "success" : po.paymentStatus === "PARTIAL" ? "warning" : "neutral"}>
            {po.paymentStatus}
          </Badge>
        </div>
        <PurchaseOrderActions id={po.id} status={po.status} paymentStatus={po.paymentStatus} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Supplier" />
          <CardBody className="space-y-1 text-sm">
            <p className="font-semibold text-ink-900">{po.supplier.name}</p>
            <p className="text-ink-500">{po.supplier.company}</p>
            {po.supplier.city && <p className="text-ink-500">{po.supplier.city}</p>}
            <Link href={`/suppliers/${po.supplier.id}`} className="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline">
              View supplier
            </Link>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Order Info" />
          <CardBody className="space-y-2 text-sm">
            <Row label="Order Date" value={formatDate(po.orderDate)} />
            <Row label="Invoice #" value={po.invoiceNumber ?? "—"} />
            <Row label="Received Date" value={po.receivedDate ? formatDate(po.receivedDate) : "—"} />
            <Row label="Created By" value={po.createdBy.name} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Amounts" />
          <CardBody className="space-y-2 text-sm">
            <Row label="Tax" value={formatCurrency(po.taxAmount)} />
            <Row label="Shipping" value={formatCurrency(po.shippingAmount)} />
            <Row label="Total" value={<span className="text-base font-bold">{formatCurrency(po.totalAmount)}</span>} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Items" />
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs font-semibold tracking-wide text-ink-400 uppercase">
                <th className="px-4 py-3">Part</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Unit Cost</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/inventory/${item.partId}`} className="font-medium text-primary-700 hover:underline">
                      {item.part.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{item.quantity}</td>
                  <td className="px-4 py-3 text-ink-600">{formatCurrency(item.unitCost)}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-500">{label}</span>
      <span className="font-medium text-ink-900">{value}</span>
    </div>
  );
}
