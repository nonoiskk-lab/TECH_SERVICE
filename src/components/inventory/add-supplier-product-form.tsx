"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { SUPPLIER_AVAILABILITY } from "@/lib/constants";

export function AddSupplierProductForm({ supplierId, parts }: { supplierId: string; parts: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [partId, setPartId] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [availability, setAvailability] = React.useState<string>("AVAILABLE");
  const [deliveryEstimate, setDeliveryEstimate] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function submit() {
    if (!partId || !price) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partId, price: Number(price), availability, deliveryEstimate }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save price.");
        return;
      }
      toast.success("Price added.");
      setOpen(false);
      setPartId("");
      setPrice("");
      setDeliveryEstimate("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Add Part Price
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-[var(--color-border)] p-3">
      <Select value={partId} onChange={(e) => setPartId(e.target.value)} className="min-w-[180px] flex-1">
        <option value="">Select a part…</option>
        {parts.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      <Input type="number" min={0} placeholder="Price" className="w-28" value={price} onChange={(e) => setPrice(e.target.value)} />
      <Select value={availability} onChange={(e) => setAvailability(e.target.value)} className="w-36">
        {SUPPLIER_AVAILABILITY.map((a) => (
          <option key={a} value={a}>
            {a.replaceAll("_", " ")}
          </option>
        ))}
      </Select>
      <Input placeholder="Delivery e.g. 2 Days" className="w-36" value={deliveryEstimate} onChange={(e) => setDeliveryEstimate(e.target.value)} />
      <Button size="sm" onClick={submit} loading={saving} disabled={!partId || !price}>
        Save
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}
