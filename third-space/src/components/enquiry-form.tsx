"use client";

import { useState } from "react";
import type { Dict } from "@/i18n";
import { getFirstTouch, track } from "@/lib/analytics";

export function EnquiryForm({ t, purposes, initialPurpose }: { t: Dict; purposes: { id: string; label: string }[]; initialPurpose?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [purpose, setPurpose] = useState(initialPurpose && purposes.some((p) => p.id === initialPurpose) ? initialPurpose : purposes[0]?.id);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("sending");
    const utm = getFirstTouch();
    const r = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        purpose,
        name: fd.get("name"),
        phone: String(fd.get("phone") ?? "").replace(/\D/g, "").slice(-10),
        message: fd.get("message") ?? "",
        source: "contact-page",
        utm,
      }),
    }).catch(() => null);
    if (r?.ok) {
      track("enquiry_submitted", { purpose: purpose ?? "" });
      setState("done");
    } else setState("error");
  }

  if (state === "done") {
    return (
      <p role="status" className="ts-card p-5 text-ok" data-testid="enquiry-success">
        {t.contact.success}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="ts-card space-y-4 p-5" data-testid="enquiry-form">
      <h2 className="text-xl font-bold">{t.contact.formTitle}</h2>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">{t.contact.purpose}</span>
        <select className="ts-input" value={purpose} onChange={(e) => setPurpose(e.target.value)} name="purpose" data-testid="enquiry-purpose">
          {purposes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">{t.contact.name}</span>
        <input className="ts-input" name="name" required minLength={2} maxLength={80} autoComplete="name" data-testid="enquiry-name" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">{t.contact.phone}</span>
        <input className="ts-input" name="phone" type="tel" inputMode="numeric" required pattern="[6-9][0-9]{9}" maxLength={10} autoComplete="tel-national" data-testid="enquiry-phone" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-muted">{t.contact.message}</span>
        <textarea className="ts-input min-h-28" name="message" maxLength={1000} aria-describedby="msg-hint" data-testid="enquiry-message" />
        <span id="msg-hint" className="mt-1 block text-xs text-faint">
          {t.contact.messageHint}
        </span>
      </label>
      {state === "error" && (
        <p role="alert" className="text-sm text-danger">
          {t.contact.failure}
        </p>
      )}
      <button type="submit" className="ts-btn ts-btn-primary w-full" disabled={state === "sending"} data-testid="enquiry-submit">
        {state === "sending" ? t.contact.sending : t.contact.submit}
      </button>
    </form>
  );
}
