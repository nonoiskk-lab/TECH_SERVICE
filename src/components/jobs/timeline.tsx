import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import {
  JOB_STATUS_CUSTOMER_LABELS,
  JOB_STATUS_FLOW,
  JOB_STATUS_LABELS,
  type JobStatus,
} from "@/lib/constants";

export type StatusEvent = { status: string; note?: string | null; createdAt: Date | string; changedBy?: { name: string } | null };

export function StatusTimeline({
  history,
  currentStatus,
  customerFacing = false,
}: {
  history: StatusEvent[];
  currentStatus: string;
  customerFacing?: boolean;
}) {
  const labels = customerFacing ? JOB_STATUS_CUSTOMER_LABELS : JOB_STATUS_LABELS;
  const reached = new Set(history.map((h) => h.status));
  const currentIndex = JOB_STATUS_FLOW.indexOf(currentStatus as JobStatus);

  // Merge the canonical happy-path with actual history so exception statuses
  // (ON_HOLD, CANCELLED, etc.) still show up if they occurred.
  const historyOnlyStatuses = history.map((h) => h.status).filter((s) => !JOB_STATUS_FLOW.includes(s as JobStatus));

  return (
    <div className="space-y-0">
      {JOB_STATUS_FLOW.map((status, i) => {
        const event = history.find((h) => h.status === status);
        const isDone = reached.has(status) && i <= currentIndex;
        const isCurrent = status === currentStatus;
        const isFuture = !isDone && !isCurrent;

        return (
          <div key={status} className="relative flex gap-3 pb-6 last:pb-0">
            {i < JOB_STATUS_FLOW.length - 1 && (
              <span
                className={cn(
                  "absolute top-6 left-[11px] h-full w-px",
                  isDone ? "bg-success-400" : "bg-ink-200"
                )}
              />
            )}
            <span className="z-10 mt-0.5">
              {isDone ? (
                <CheckCircle2 className="size-[22px] text-success-600" />
              ) : isCurrent ? (
                <Loader2 className="size-[22px] animate-spin text-primary-600" />
              ) : (
                <Circle className="size-[22px] text-ink-300" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-semibold", isFuture ? "text-ink-400" : "text-ink-900")}>
                {labels[status]}
              </p>
              {event ? (
                <>
                  <p className="text-xs text-ink-500">{formatDateTime(event.createdAt)}</p>
                  {!customerFacing && event.note && <p className="mt-1 text-sm text-ink-600">{event.note}</p>}
                  {!customerFacing && event.changedBy && (
                    <p className="mt-0.5 text-xs text-ink-400">by {event.changedBy.name}</p>
                  )}
                </>
              ) : isCurrent ? (
                <p className="text-xs font-medium text-primary-600">In progress</p>
              ) : (
                <p className="text-xs text-ink-400">Pending</p>
              )}
            </div>
          </div>
        );
      })}

      {historyOnlyStatuses.length > 0 && !customerFacing && (
        <div className="mt-4 space-y-3 border-t border-dashed border-[var(--color-border)] pt-4">
          {history
            .filter((h) => !JOB_STATUS_FLOW.includes(h.status as JobStatus))
            .map((h, i) => (
              <div key={i} className="flex gap-3">
                <span className="mt-0.5 size-[22px] shrink-0 rounded-full bg-danger-100 text-center text-xs font-bold text-danger-600 leading-[22px]">
                  !
                </span>
                <div>
                  <p className="text-sm font-semibold text-danger-700">{JOB_STATUS_LABELS[h.status as JobStatus] ?? h.status}</p>
                  <p className="text-xs text-ink-500">{formatDateTime(h.createdAt)}</p>
                  {h.note && <p className="mt-1 text-sm text-ink-600">{h.note}</p>}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
