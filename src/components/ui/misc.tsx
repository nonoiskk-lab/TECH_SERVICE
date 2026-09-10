import * as React from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-6 py-14 text-center">
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <Icon className="size-6" />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-ink-100", className)} />;
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700",
        className
      )}
    >
      {initials(name) || "?"}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700 select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-ink-300 text-primary-600 focus:ring-primary-500"
      />
      {label}
    </label>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto scroll-thin border-b border-[var(--color-border)]">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "relative flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium transition-colors",
            active === tab.key ? "text-primary-700" : "text-ink-500 hover:text-ink-800"
          )}
        >
          {tab.label}
          {typeof tab.count === "number" && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                active === tab.key ? "bg-primary-100 text-primary-700" : "bg-ink-100 text-ink-500"
              )}
            >
              {tab.count}
            </span>
          )}
          {active === tab.key && (
            <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary-600" />
          )}
        </button>
      ))}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
