/**
 * Status Badge (Confirmed, Pending advance, Completed, Cancelled). Colour never carries the meaning alone:
 * the label is always text. Tone comes from the booking or payment status.
 */
export type Tone = "ok" | "warn" | "bad" | "muted";

const TONES: Record<string, Tone> = {
  confirmed: "ok", checked_in: "ok", in_progress: "ok", captured: "ok", sent: "ok", contacted: "ok", active: "ok",
  pending_payment: "warn", refund_pending: "warn", pending: "warn", created: "warn", queued: "warn", new: "warn", rescheduling: "warn",
  cancelled: "bad", stopped: "bad", failed: "bad", open: "bad",
  completed: "muted", refunded: "muted", no_show: "muted", closed: "muted", hidden: "muted",
};

export const toneOf = (status: string): Tone => TONES[status] ?? "muted";

export function StatusBadge({ status, label, testId }: { status: string; label?: string; testId?: string }) {
  return (
    <span className="ts-status" data-tone={toneOf(status)} data-status={status} data-testid={testId}>
      {label ?? status.replace("_", " ")}
    </span>
  );
}
