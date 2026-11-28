import { toIstIso, istTimeLabel } from "@/server/slots/time";
import { StatusBadge } from "@/components/status-badge";

export function fmtDateTime(d: Date) {
  const day = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  return `${day}, ${istTimeLabel(toIstIso(d))}`;
}

export function fmtTime(d: Date) {
  return istTimeLabel(toIstIso(d));
}

export function Status({ value }: { value: string }) {
  return <StatusBadge status={value} />;
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
