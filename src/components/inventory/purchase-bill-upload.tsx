"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, CheckCircle2, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MAX_BILL_FILE_BYTES, ALLOWED_BILL_FILE_TYPES } from "@/lib/constants";

type Bill = { billFileUrl: string | null; billFileName: string | null; billUploadedAt: Date | string | null; billUploadedByName?: string | null };

export function PurchaseBillUpload({ purchaseOrderId, bill }: { purchaseOrderId: string; bill: Bill }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_BILL_FILE_TYPES.includes(file.type as (typeof ALLOWED_BILL_FILE_TYPES)[number])) {
      toast.error("Unsupported file type. Upload a JPG, PNG, WebP or PDF.");
      return;
    }
    if (file.size > MAX_BILL_FILE_BYTES) {
      toast.error(`File is too large. Maximum size is ${Math.floor(MAX_BILL_FILE_BYTES / (1024 * 1024))}MB.`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/purchase-orders/${purchaseOrderId}/bill`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Bill upload failed. Please try again.");
        return;
      }
      toast.success("Purchase bill uploaded successfully.");
      router.refresh();
    } catch {
      toast.error("Bill upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const isPdf = bill.billFileUrl?.startsWith("data:application/pdf");

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_BILL_FILE_TYPES.join(",")}
        className="hidden"
        onChange={handleFile}
      />

      {bill.billFileUrl ? (
        <>
          <div className="flex items-center gap-2 text-sm font-medium text-success-700">
            <CheckCircle2 className="size-4" /> Bill Uploaded
          </div>
          {bill.billUploadedAt && (
            <p className="text-xs text-ink-500">
              {bill.billUploadedByName ? `By ${bill.billUploadedByName} · ` : ""}
              {new Date(bill.billUploadedAt).toLocaleString("en-IN")}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {isPdf ? (
              <a href={bill.billFileUrl} target="_blank" rel="noopener noreferrer">
                <Button type="button" variant="outline" size="sm">
                  <Eye className="size-4" /> View Bill
                </Button>
              </a>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                <Eye className="size-4" /> View Bill
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} loading={uploading}>
              <RefreshCw className="size-4" /> Replace Bill
            </Button>
          </div>
        </>
      ) : (
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} loading={uploading}>
          <Upload className="size-4" /> {uploading ? "Uploading Bill..." : "Upload Purchase Bill"}
        </Button>
      )}

      {bill.billFileUrl && !isPdf && (
        <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Purchase Bill" size="lg">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL, not an optimizable remote/static asset */}
          <img src={bill.billFileUrl} alt={bill.billFileName ?? "Purchase bill"} className="w-full rounded-lg" />
        </Modal>
      )}
    </div>
  );
}
