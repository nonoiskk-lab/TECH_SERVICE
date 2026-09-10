import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SectionHeading, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function PurchasesPage() {
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    orderBy: { orderDate: "desc" },
    include: { supplier: true, items: true },
  });

  return (
    <div>
      <SectionHeading
        title="Purchases"
        description="Purchase orders raised with suppliers to restock parts."
        action={
          <Link href="/purchases/new">
            <Button>
              <Plus className="size-4" /> New Purchase Order
            </Button>
          </Link>
        }
      />

      <Card>
        {purchaseOrders.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={ShoppingCart} title="No purchase orders yet" description="Create one when you need to restock parts." />
          </div>
        ) : (
          <>
            <div className="divide-y divide-[var(--color-border)] sm:hidden">
              {purchaseOrders.map((po) => (
                <Link key={po.id} href={`/purchases/${po.id}`} className="flex items-center justify-between gap-3 p-4 active:bg-ink-50">
                  <div className="min-w-0">
                    <p className="font-semibold text-primary-700">{po.poNumber}</p>
                    <p className="truncate text-xs text-ink-500">
                      {po.supplier.name} · {formatDate(po.orderDate)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-ink-900">{formatCurrency(po.totalAmount)}</p>
                    <Badge tone={po.status === "RECEIVED" ? "success" : po.status === "CANCELLED" ? "danger" : "info"}>{po.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
            <div className="hidden overflow-x-auto scroll-thin sm:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs font-semibold tracking-wide text-ink-400 uppercase">
                  <th className="px-4 py-3">PO Number</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Order Date</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-ink-50/70">
                    <td className="px-4 py-3">
                      <Link href={`/purchases/${po.id}`} className="font-semibold text-primary-700 hover:underline">
                        {po.poNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{po.supplier.name}</td>
                    <td className="px-4 py-3 text-ink-600">{po.items.length}</td>
                    <td className="px-4 py-3 font-medium text-ink-900">{formatCurrency(po.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={po.status === "RECEIVED" ? "success" : po.status === "CANCELLED" ? "danger" : "info"}>{po.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={po.paymentStatus === "PAID" ? "success" : po.paymentStatus === "PARTIAL" ? "warning" : "neutral"}>
                        {po.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-500">{formatDate(po.orderDate)}</td>
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
