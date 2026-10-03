import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, toWhatsAppNumber } from "@/lib/utils";
import { AddSupplierProductForm } from "@/components/inventory/add-supplier-product-form";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [supplier, parts] = await Promise.all([
    prisma.supplier.findUnique({
      where: { id },
      include: {
        supplierProducts: { include: { part: true }, orderBy: { updatedAt: "desc" } },
        purchaseOrders: { orderBy: { orderDate: "desc" }, include: { items: true } },
      },
    }),
    prisma.part.findMany({ where: { isArchived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!supplier) notFound();

  const waLink = supplier.whatsapp
    ? `https://wa.me/${toWhatsAppNumber(supplier.whatsapp)}?text=${encodeURIComponent(`Hi ${supplier.contactPerson ?? supplier.name}, `)}`
    : null;

  return (
    <div className="space-y-5">
      <Link href="/suppliers" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="size-4" /> Back to suppliers
      </Link>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title={supplier.name} description={supplier.company} />
          <CardBody className="space-y-2 text-sm">
            {supplier.contactPerson && <Row label="Contact" value={supplier.contactPerson} />}
            {supplier.mobile && (
              <p className="flex items-center gap-2 text-ink-700">
                <Phone className="size-3.5 text-ink-400" /> {supplier.mobile}
              </p>
            )}
            {supplier.email && (
              <p className="flex items-center gap-2 text-ink-700">
                <Mail className="size-3.5 text-ink-400" /> {supplier.email}
              </p>
            )}
            {supplier.address && (
              <p className="flex items-start gap-2 text-ink-700">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-ink-400" /> {supplier.address}
              </p>
            )}
            {supplier.gst && <Row label="GST" value={supplier.gst} />}
            {supplier.paymentTerms && <Row label="Payment Terms" value={supplier.paymentTerms} />}
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="block pt-2">
                <Button variant="secondary" className="w-full">
                  <MessageCircle className="size-4" /> Message on WhatsApp
                </Button>
              </a>
            )}
          </CardBody>
        </Card>

        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader title="Parts Supplied" description="Prices this supplier has quoted, for comparison shopping" />
            <CardBody className="space-y-3">
              <AddSupplierProductForm supplierId={supplier.id} parts={parts} />
              {supplier.supplierProducts.length === 0 ? (
                <p className="text-sm text-ink-500">No parts priced yet.</p>
              ) : (
                <div className="overflow-x-auto scroll-thin">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
                        <th className="py-2">Part</th>
                        <th className="py-2">Price</th>
                        <th className="py-2">Availability</th>
                        <th className="py-2">Delivery</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplier.supplierProducts.map((sp) => (
                        <tr key={sp.id} className="border-t border-[var(--color-border)]">
                          <td className="py-2 font-medium text-ink-900">{sp.part.name}</td>
                          <td className="py-2 text-ink-700">{formatCurrency(sp.price)}</td>
                          <td className="py-2">
                            <Badge tone={sp.availability === "AVAILABLE" ? "success" : sp.availability === "ON_ORDER" ? "warning" : "danger"}>
                              {sp.availability.replaceAll("_", " ")}
                            </Badge>
                          </td>
                          <td className="py-2 text-ink-500">{sp.deliveryEstimate ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Purchase Order History" />
            <CardBody className="space-y-2">
              {supplier.purchaseOrders.length === 0 && <p className="text-sm text-ink-500">No purchase orders yet.</p>}
              {supplier.purchaseOrders.map((po) => (
                <Link
                  key={po.id}
                  href={`/purchases/${po.id}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3 hover:border-primary-300"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{po.poNumber}</p>
                    <p className="text-xs text-ink-500">{formatDate(po.orderDate)} · {po.items.length} item(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink-900">{formatCurrency(po.totalAmount)}</p>
                    <Badge tone={po.status === "RECEIVED" ? "success" : po.status === "CANCELLED" ? "danger" : "info"}>{po.status}</Badge>
                  </div>
                </Link>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
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
