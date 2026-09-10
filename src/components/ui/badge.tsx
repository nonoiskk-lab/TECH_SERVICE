import * as React from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "progress";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  info: "bg-info-50 text-info-700",
  warning: "bg-warning-50 text-warning-700",
  success: "bg-success-50 text-success-700",
  danger: "bg-danger-50 text-danger-700",
  progress: "bg-accent-400/15 text-accent-600",
};

const dotClasses: Record<Tone, string> = {
  neutral: "bg-ink-400",
  info: "bg-info-600",
  warning: "bg-warning-600",
  success: "bg-success-600",
  danger: "bg-danger-600",
  progress: "bg-accent-500",
};

export function Badge({
  tone = "neutral",
  className,
  dot = false,
  children,
}: {
  tone?: Tone;
  className?: string;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        toneClasses[tone],
        className
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dotClasses[tone])} />}
      {children}
    </span>
  );
}
