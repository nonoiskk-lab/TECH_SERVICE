"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";

export function PartActions({ partId, partName, isArchived }: { partId: string; partName: string; isArchived: boolean }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function setArchived(value: boolean) {
    setSaving(true);
    try {
      const res = await fetch(`/api/parts/${partId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      toast.success(value ? "Part deleted." : "Part restored.");
      setConfirmOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (isArchived) {
    return (
      <Button variant="outline" size="sm" onClick={() => setArchived(false)} loading={saving}>
        <RotateCcw className="size-4" /> Restore
      </Button>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
        <Trash2 className="size-4" /> Delete
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setArchived(true)}
        title="Delete this part?"
        description={`"${partName}" will be removed from active inventory. Its past job and purchase history stays on record, and an Admin can restore it any time.`}
        confirmLabel="Delete Part"
        tone="danger"
        loading={saving}
      />
    </>
  );
}
