import { toIstIso, istTimeLabel } from "@/server/slots/time";

export function fmtDateTime(d: Date) {
  const day = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  return `${day}, ${istTimeLabel(toIstIso(d))}`;
}

export function fmtTime(d: Date) {
  return istTimeLabel(toIstIso(d));
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "border-warm text-warm",
  pending_payment: "border-danger text-danger",
  in_progress: "border-ok text-ok",
  refund_pending: "border-danger text-danger",
  refunded: "border-line text-muted",
  rescheduling: "border-line text-muted",
  captured: "border-ok text-ok",
  created: "border-warm text-warm",
  failed: "border-danger text-danger",
  pending: "border-warm text-warm",
  checked_in: "border-ok text-ok",
  completed: "border-line text-muted",
  cancelled: "border-line text-faint line-through",
  stopped: "border-danger text-danger",
  no_show: "border-line text-faint",
  open: "border-danger text-danger",
  closed: "border-line text-muted",
  queued: "border-warm text-warm",
  sent: "border-ok text-ok",
  new: "border-warm text-warm",
  contacted: "border-ok text-ok",
  active: "border-ok text-ok",
  hidden: "border-line text-faint",
};

export function Status({ value }: { value: string }) {
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[value] ?? "border-line"}`}>{value.replace("_", " ")}</span>;
}

export function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-6 text-2xl font-extrabold">{children}</h1>;
}

export function Card({ title, children, testId }: { title?: string; children: React.ReactNode; testId?: string }) {
  return (
    <section className="ts-card p-4 sm:p-5" data-testid={testId}>
      {title && <h2 className="mb-3 text-lg font-bold">{title}</h2>}
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = "ts-input";

/** Hours from now until `d` (negative if past). Server-side helper. */
export function hoursUntil(d: Date) {
  return (d.getTime() - Date.now()) / 3600_000;
}

export function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60_000);
}
