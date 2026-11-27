import type { Booking, Payment, RecordingFile } from "@prisma/client";
import { addOns } from "@/config/site";
import { getPackage } from "@/config/packages";
import { tl, type Dict } from "@/i18n";
import type { Locale } from "@/config/site";
import { formatINR } from "@/lib/pricing";
import { durationText } from "@/lib/session";
import { istTimeLabel, toIstIso } from "@/server/slots/time";
import { StatusBadge } from "./status-badge";
import { TicketQr } from "./ticket-qr";
import { siteUrl } from "@/config/site";

/** Receipt + booking summary shown on the confirmation and My Booking pages (guest's own booking only). */
export function BookingReceipt({ b, t, locale, token }: { b: Booking & { payments: Payment[]; recordings?: RecordingFile[] }; t: Dict; locale: Locale; token: string }) {
  const pkg = getPackage(b.packageId);
  const day = b.start.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  const m = t.myBooking;
  const now = new Date();
  const files = (b.recordings ?? []).filter((r) => r.expiresAt > now);
  return (
    <div className="space-y-4" data-testid="receipt">
      {["confirmed", "checked_in", "in_progress"].includes(b.status) && (
        <div className="ts-card flex flex-col items-center gap-3 p-6 text-center" data-testid="ticket">
          <h2 className="t-h3">{t.confirmation.ticketTitle}</h2>
          <TicketQr value={`${siteUrl()}/staff/${b.id}`} label={t.confirmation.ticketAlt.replace("{id}", b.id)} />
          <p className="text-sm text-muted">{t.confirmation.ticketHelp}</p>
        </div>
      )}
      <div className="ts-card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-heading text-3xl tracking-wide text-warm" data-testid="receipt-id">
            {b.id}
          </p>
          <StatusBadge status={b.status} label={m.statusLabels[b.status as keyof typeof m.statusLabels] ?? b.status} testId="receipt-status" />
        </div>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">{t.confirmation.package}</dt>
          <dd>
            {pkg ? tl(pkg.name, locale) : b.packageName}
            {b.titleName ? ` · ${b.titleName}` : ""}
          </dd>
          <dt className="text-muted">{t.confirmation.when}</dt>
          <dd>
            {day}, {istTimeLabel(toIstIso(b.start))} – {istTimeLabel(toIstIso(b.end))} ({durationText(Math.round((b.end.getTime() - b.start.getTime()) / 60000))})
          </dd>
          <dt className="text-muted">{t.confirmation.guests}</dt>
          <dd>{b.guestCount}</dd>
          <dt className="text-muted">{m.customer}</dt>
          <dd>
            {b.guestName} · {b.guestPhone.slice(0, 2)}•••••{b.guestPhone.slice(-3)}
          </dd>
          {b.addOnIds.length > 0 && (
            <>
              <dt className="text-muted">{m.addOns}</dt>
              <dd>{b.addOnIds.map((id) => addOns.find((a) => a.id === id)?.name[locale] ?? id).join(", ")}</dd>
            </>
          )}
        </dl>
      </div>
      <div className="ts-card p-6">
        <h2 className="text-xl">{m.receipt}</h2>
        <dl className="mt-3 space-y-1 text-sm">
          {b.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">
                {m.discount} {b.couponCode ? `(${b.couponCode})` : ""}
              </dt>
              <dd>−{formatINR(b.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">{m.subtotal}</dt>
            <dd>{formatINR(b.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{m.tax}</dt>
            <dd>{formatINR(b.tax)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-1 font-semibold">
            <dt>{m.total}</dt>
            <dd>{formatINR(b.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{m.paid}</dt>
            <dd data-testid="receipt-paid">{formatINR(b.advancePaid)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{m.due}</dt>
            <dd>{formatINR(b.balanceDue)}</dd>
          </div>
        </dl>
        {b.payments.filter((p) => p.status === "captured" || p.kind === "refund").length > 0 && (
          <>
            <h3 className="mt-4 text-sm font-semibold text-muted">{m.payments}</h3>
            <ul className="mt-1 text-sm">
              {b.payments
                .filter((p) => p.status === "captured" || p.kind === "refund")
                .map((p) => (
                  <li key={p.id}>
                    {p.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} · {p.kind} · {p.provider} {p.paymentId ?? ""} · {p.kind === "refund" ? "−" : ""}
                    {formatINR(p.amount)}
                  </li>
                ))}
            </ul>
          </>
        )}
      </div>
      {files.length > 0 && (
        <div className="ts-card p-6" data-testid="guest-files">
          <h2 className="text-xl">{m.files}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {f.label} · {m.expires} {f.expiresAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                </span>
                <a href={`/files/${f.token}?b=${token}`} className="ts-btn ts-btn-primary text-sm" rel="noopener">
                  {m.download}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
