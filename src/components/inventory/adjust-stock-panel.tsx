"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FormRow } from "@/components/ui/field";

export function AdjustStockPanel({ partId, currentQuantity }: { partId: string; currentQuantity: number }) {
  const router = useRouter();
  const [type, setType] = React.useState<"RETURN" | "DAMAGED" | "ADJUSTMENT">("ADJUSTMENT");
  const [direction, setDirection] = React.useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = React.useState("1");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function submit() {
    const qty = Number(quantity);
    if (!qty || qty <= 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/parts/${partId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, quantity: direction === "IN" ? qty : -qty, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not adjust stock.");
        return;
      }
      toast.success("Stock updated.");
      setNote("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Adjust Stock" description={`Currently ${currentQuantity} in stock`} />
      <CardBody className="space-y-3">
        <FormRow>
          <Label>Movement Type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="ADJUSTMENT">Manual Adjustment</option>
            <option value="RETURN">Return (customer/supplier)</option>
            <option value="DAMAGED">Damaged / Written Off</option>
          </Select>
        </FormRow>
        <div className="grid grid-cols-2 gap-3">
          <FormRow>
            <Label>Direction</Label>
            <Select value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)}>
              <option value="IN">Add to stock (+)</option>
              <option value="OUT">Remove from stock (-)</option>
            </Select>
          </FormRow>
          <FormRow>
            <Label>Quantity</Label>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </FormRow>
        </div>
        <FormRow>
          <Label>Note</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for adjustment" />
        </FormRow>
        <Button className="w-full" onClick={submit} loading={saving}>
          Apply Adjustment
        </Button>
      </CardBody>
    </Card>
  );
}
