import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canDeleteRecords } from "@/lib/permissions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { stockLevelFor } from "@/lib/constants";
import { AdjustStockPanel } from "@/components/inventory/adjust-stock-panel";
import { PartActions } from "@/components/inventory/part-actions";

const LEVEL_TONE = { NORMAL: "success", LOW: "warning", CRITICAL: "danger", OUT_OF_STOCK: "danger" } as const;

export default async function PartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const part = await prisma.part.findUnique({
    where: { id },
    include: {
      supplierOptions: { include: { supplier: true }, orderBy: { price: "asc" } },
      inventoryMovements: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { createdBy: true, job: { select: { id: true, jobNumber: true } } },
      },
    },
  });
  if (!part) notFound();

  const session = await getSession();
  const canDelete = canDeleteRecords(session?.role ?? "FRONT_DESK");
  const level = stockLevelFor(part.quantity, part.minStock);

  return (
    <div className="space-y-5">
      <Link href="/inventory" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="size-4" /> Back to inventory
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">{part.name}</h1>
        {part.isArchived ? (
          <Badge tone="neutral">Deleted</Badge>
        ) : (
          <Badge tone={LEVEL_TONE[level]}>{level.replaceAll("_", " ")}</Badge>
        )}
        {canDelete && (
          <div className="ml-auto">
            <PartActions partId={part.id} partName={part.name} isArchived={part.isArchived} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Details" />
          <CardBody className="space-y-2 text-sm">
            <Row label="Category" value={part.category.replaceAll("_", " ")} />
            <Row label="Brand / Model" value={[part.brand, part.model].filter(Boolean).join(" · ") || "—"} />
            <Row label="SKU" value={part.sku ?? "—"} />
            <Row label="Current Stock" value={`${part.quantity} units`} />
            <Row label="Minimum Stock" value={`${part.minStock} units`} />
            <Row label="Purchase Price" value={formatCurrency(part.purchasePrice)} />
            <Row label="Selling Price" value={formatCurrency(part.sellingPrice)} />
            <Row label="Warranty" value={part.warrantyDays ? `${part.warrantyDays} days` : "—"} />
            <Row label="Location" value={[part.location, part.rack].filter(Boolean).join(" / ") || "—"} />
          </CardBody>
        </Card>

        <AdjustStockPanel partId={part.id} currentQuantity={part.quantity} />

        <Card>
          <CardHeader title="Supplier Comparison" description="Compare price, availability & delivery" />
          <CardBody className="space-y-2">
            {part.supplierOptions.length === 0 && <p className="text-sm text-ink-500">No supplier pricing on file yet.</p>}
            {part.supplierOptions.map((so) => (
              <Link
                key={so.id}
                href={`/suppliers/${so.supplierId}`}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3 hover:border-primary-300"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">{so.supplier.name}</p>
                  <p className="text-xs text-ink-500">
                    {so.location ?? so.supplier.city ?? "—"} · {so.deliveryEstimate ?? "Delivery TBD"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-ink-900">{formatCurrency(so.price)}</p>
                  <Badge tone={so.availability === "AVAILABLE" ? "success" : so.availability === "ON_ORDER" ? "warning" : "danger"}>
                    {so.availability.replaceAll("_", " ")}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Stock Movement History" />
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs font-semibold tracking-wide text-ink-400 uppercase">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">By</th>
              </tr>
            </thead>
            <tbody>
              {part.inventoryMovements.map((m) => (
                <tr key={m.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-3 text-ink-600">{formatDateTime(m.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{m.type.replaceAll("_", " ")}</Badge>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${m.quantity > 0 ? "text-success-600" : "text-danger-600"}`}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </td>
                  <td className="px-4 py-3 text-ink-500">
                    {m.job ? (
                      <Link href={`/jobs/${m.job.id}`} className="text-primary-600 hover:underline">
                        {m.job.jobNumber}
                      </Link>
                    ) : (
                      m.note ?? "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-500">{m.createdBy.name}</td>
                </tr>
              ))}
              {part.inventoryMovements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-ink-500">
                    No stock movements yet.
                  </td>
                </tr>
              )}
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
