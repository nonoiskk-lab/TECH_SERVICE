import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "danger" | "info" | "neutral";

const toneClasses: Record<Tone, { icon: string; ring: string }> = {
  primary: { icon: "bg-primary-50 text-primary-600", ring: "" },
  success: { icon: "bg-success-50 text-success-600", ring: "" },
  warning: { icon: "bg-warning-50 text-warning-600", ring: "" },
  danger: { icon: "bg-danger-50 text-danger-600", ring: "" },
  info: { icon: "bg-info-50 text-info-600", ring: "" },
  neutral: { icon: "bg-ink-100 text-ink-600", ring: "" },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  trend,
  href,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: Tone;
  trend?: { label: string; positive?: boolean };
  href?: string;
}) {
  const content = (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-popover)]">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{label}</p>
        <p className="mt-1.5 text-2xl font-bold text-ink-900">{value}</p>
        {trend && (
          <p className={cn("mt-1 text-xs font-medium", trend.positive ? "text-success-600" : "text-ink-500")}>
            {trend.label}
          </p>
        )}
      </div>
      {Icon && (
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", toneClasses[tone].icon)}>
          <Icon className="size-5" />
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
