"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STATUS_TO_TEMPLATE, STATUS_WHATSAPP_BUTTON_LABEL, type JobStatus } from "@/lib/constants";

// `status` picks the right customer-friendly template for the job's current
// (already-saved) status — RECEIVED/REPAIR_IN_PROGRESS/DELIVERED/CLOSED each
// get their own message. Omit it (or pass a label) to fall back to the
// generic status-check-link template, used e.g. from the Communication tab.
export function SendStatusLinkButton({
  jobId,
  status,
  label,
}: {
  jobId: string;
  status?: JobStatus;
  label?: string;
}) {
  const router = useRouter();
  const [sending, setSending] = React.useState(false);

  const templateKey = status ? STATUS_TO_TEMPLATE[status] : "STATUS_LINK";
  const buttonLabel = label ?? (status ? STATUS_WHATSAPP_BUTTON_LABEL[status] : "Send Status Link");

  async function send() {
    setSending(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not prepare the WhatsApp update.");
        return;
      }
      if (data.waLink) {
        window.open(data.waLink, "_blank", "noopener,noreferrer");
        toast.success("WhatsApp opened with the update ready to send.");
      } else {
        toast.success("WhatsApp update sent.");
      }
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <Button variant="secondary" className="w-full" onClick={send} loading={sending}>
      <Send className="size-4" /> {buttonLabel}
    </Button>
  );
}
