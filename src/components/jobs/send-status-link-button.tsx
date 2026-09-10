"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SendStatusLinkButton({ jobId, label = "Send Status Link" }: { jobId: string; label?: string }) {
  const router = useRouter();
  const [sending, setSending] = React.useState(false);

  async function send() {
    setSending(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey: "STATUS_LINK" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not send status link.");
        return;
      }
      if (data.waLink) {
        window.open(data.waLink, "_blank", "noopener,noreferrer");
        toast.success("Opening WhatsApp with the status link ready to send.");
      } else {
        toast.success("Status link sent on WhatsApp.");
      }
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <Button variant="secondary" className="w-full" onClick={send} loading={sending}>
      <Send className="size-4" /> {label}
    </Button>
  );
}
