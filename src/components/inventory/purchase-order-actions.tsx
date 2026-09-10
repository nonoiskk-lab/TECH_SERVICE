"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { PAYMENT_STATUSES_PO } from "@/lib/constants";

export function PurchaseOrderActions({
  id,
  status,
  paymentStatus,
}: {
  id: string;
  status: string;
  paymentStatus: string;
}) {
  const router = useRouter();
  const [receiving, setReceiving] = React.useState(false);
  const [updatingPayment, setUpdatingPayment] = React.useState(false);

  async function markReceived() {
    setReceiving(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}/receive`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not mark as received.");
        return;
      }
      toast.success("Marked as received — stock levels updated.");
      router.refresh();
    } finally {
      setReceiving(false);
    }
  }

  async function updatePaymentStatus(value: string) {
    setUpdatingPayment(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: value }),
      });
      if (!res.ok) {
        toast.error("Could not update payment status.");
        return;
      }
      router.refresh();
    } finally {
      setUpdatingPayment(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        defaultValue={paymentStatus}
        onChange={(e) => updatePaymentStatus(e.target.value)}
        disabled={updatingPayment}
        className="w-auto"
      >
        {PAYMENT_STATUSES_PO.map((s) => (
          <option key={s} value={s}>
            Payment: {s}
          </option>
        ))}
      </Select>
      {status === "ORDERED" && (
        <Button onClick={markReceived} loading={receiving}>
          <PackageCheck className="size-4" /> Mark as Received
        </Button>
      )}
    </div>
  );
}
