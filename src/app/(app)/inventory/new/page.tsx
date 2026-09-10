"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Select, FormRow } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PART_CATEGORIES } from "@/lib/constants";

export default function NewPartPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    category: PART_CATEGORIES[0],
    brand: "",
    model: "",
    sku: "",
    quantity: "0",
    minStock: "2",
    purchasePrice: "0",
    sellingPrice: "0",
    warrantyDays: "",
    location: "",
    rack: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not add part.");
        return;
      }
      toast.success("Part added to inventory.");
      router.push(`/inventory/${data.part.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/inventory" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="size-4" /> Back to inventory
      </Link>
      <Card>
        <CardHeader title="Add Part" description="Register a new part in your inventory." />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow>
                <Label required>Part Name</Label>
                <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>Category</Label>
                <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
                  {PART_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </FormRow>
              <FormRow>
                <Label>Brand</Label>
                <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>Model</Label>
                <Input value={form.model} onChange={(e) => set("model", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>Warranty (days)</Label>
                <Input type="number" min={0} value={form.warrantyDays} onChange={(e) => set("warrantyDays", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>Opening Quantity</Label>
                <Input type="number" min={0} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>Minimum Stock</Label>
                <Input type="number" min={0} value={form.minStock} onChange={(e) => set("minStock", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>Purchase Price</Label>
                <Input type="number" min={0} value={form.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>Selling Price</Label>
                <Input type="number" min={0} value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} />
              </FormRow>
              <FormRow>
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Main Store" />
              </FormRow>
              <FormRow>
                <Label>Rack</Label>
                <Input value={form.rack} onChange={(e) => set("rack", e.target.value)} />
              </FormRow>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Link href="/inventory">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" loading={loading}>
                Save Part
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
