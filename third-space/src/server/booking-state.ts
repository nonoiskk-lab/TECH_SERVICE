/**
 * Operational booking transitions (what staff can do on the day). Payment and cancellation
 * transitions live with their own services; this table guards the check-in to completion line so
 * a cancelled or refunded booking can never be "completed" and a finished one cannot be reopened.
 */
export type OpsStatus = "checked_in" | "in_progress" | "completed" | "no_show" | "stopped";

const ALLOWED: Record<string, readonly OpsStatus[]> = {
  confirmed: ["checked_in", "no_show"],
  checked_in: ["in_progress", "completed", "stopped"],
  in_progress: ["completed", "stopped"],
};

export function canOpsTransition(from: string, to: string, opts: { start?: Date; now?: Date } = {}): boolean {
  if (!(ALLOWED[from] as readonly string[] | undefined)?.includes(to)) return false;
  // A guest cannot be a no-show before the session has started.
  if (to === "no_show" && opts.start && opts.start.getTime() > (opts.now ?? new Date()).getTime()) return false;
  return true;
}

export function nextOpsActions(status: string): OpsStatus[] {
  return [...(ALLOWED[status] ?? [])];
}
