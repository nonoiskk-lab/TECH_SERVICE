import { Badge } from "@/components/ui/badge";
import { JOB_STATUS_LABELS, JOB_STATUS_TONE, type JobStatus } from "@/lib/constants";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = status as JobStatus;
  const label = JOB_STATUS_LABELS[s] ?? status;
  const tone = JOB_STATUS_TONE[s] ?? "neutral";
  return (
    <Badge tone={tone} dot className={className}>
      {label}
    </Badge>
  );
}
