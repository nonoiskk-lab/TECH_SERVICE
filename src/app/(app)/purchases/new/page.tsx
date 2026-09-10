"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Select, FormRow } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type Supplier = { id: string; name: string; company: string };
type Part = { id: string; name: string; quantity: number; minStock: number };
type Line = { partId: string; quantity: string; unitCost: string };

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [parts, setParts] = React.useState<Part[]>([]);
  const [supplierId, setSupplierId] = React.useState("");
  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const [taxAmount, setTaxAmount] = React.useState("0");
  const [shippingAmount, setShippingAmount] = React.useState("0");
  const [lines, setLines] = React.useState<Line[]>([{ partId: "", quantity: "1", unitCost: "0" }]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d) => setSuppliers(d.suppliers ?? []));
    fetch("/api/parts")
      .then((r) => r.json())
      .then((d) => setParts(d.parts ?? []));
  }, []);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { partId: "", quantity: "1", unitCost: "0" }]);
  }
  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const itemsTotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0);
  const total = itemsTotal + (Number(taxAmount) || 0) + (Number(shippingAmount) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) {
      toast.error("Select a supplier.");
      return;
    }
    const validLines = lines.filter((l) => l.partId && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      toast.error("Add at least one part.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          invoiceNumber,
          taxAmount: Number(taxAmount) || 0,
          shippingAmount: Number(shippingAmount) || 0,
          items: validLines.map((l) => ({ partId: l.partId, quantity: Number(l.quantity), unitCost: Number(l.unitCost) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create purchase order.");
        return;
      }
      toast.success(`Purchase order ${data.purchaseOrder.poNumber} created.`);
      router.push(`/purchases/${data.purchaseOrder.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/purchases" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="size-4" /> Back to purchases
      </Link>
      <Card>
        <CardHeader title="New Purchase Order" description="Order parts from a supplier to restock inventory." />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow>
                <Label required>Supplier</Label>
                <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                  <option value="">Select a supplier…</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.company})
                    </option>
                  ))}
                </Select>
              </FormRow>
              <FormRow>
                <Label>Invoice Number</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </FormRow>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-ink-900">Items</p>
              <div className="space-y-2">
                {lines.map((l, i) => {
                  const part = parts.find((p) => p.id === l.partId);
                  return (
                    <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--color-border)] p-3">
                      <FormRow className="min-w-[200px] flex-1">
                        <Label>Part</Label>
                        <Select value={l.partId} onChange={(e) => updateLine(i, { partId: e.target.value })}>
                          <option value="">Select a part…</option>
                          {parts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.quantity} in stock{p.quantity <= p.minStock ? " — low" : ""})
                            </option>
                          ))}
                        </Select>
                      </FormRow>
                      <FormRow className="w-24">
                        <Label>Qty</Label>
                        <Input type="number" min={1} value={l.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} />
                      </FormRow>
                      <FormRow className="w-28">
                        <Label>Unit Cost</Label>
                        <Input type="number" min={0} value={l.unitCost} onChange={(e) => updateLine(i, { unitCost: e.target.value })} />
                      </FormRow>
                      <p className="w-28 pb-2 text-sm font-medium text-ink-900">
                        {formatCurrency((Number(l.quantity) || 0) * (Number(l.unitCost) || 0))}
                      </p>
                      <button type="button" onClick={() => removeLine(i)} className="mb-2 text-ink-400 hover:text-danger-600">
                        <Trash2 className="size-4" />
                      </button>
                      {part && part.quantity <= part.minStock && (
                        <p className="w-full text-xs text-warning-700">Low stock — {part.quantity} left</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addLine}>
                <Plus className="size-4" /> Add Item
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow>
                <Label>Tax Amount</Label>
                <Input type="number" min={0} value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>Shipping Amount</Label>
                <Input type="number" min={0} value={shippingAmount} onChange={(e) => setShippingAmount(e.target.value)} />
              </FormRow>
            </div>

            <div className="flex justify-end border-t border-[var(--color-border)] pt-3 text-sm">
              <div className="w-56 space-y-1">
                <div className="flex justify-between">
                  <span className="text-ink-500">Items Total</span>
                  <span>{formatCurrency(itemsTotal)}</span>
                </div>
                <div className="flex justify-between border-t border-[var(--color-border)] pt-1 font-semibold text-ink-900">
                  <span>Grand Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Link href="/purchases">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" loading={saving}>
                Create Purchase Order
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
