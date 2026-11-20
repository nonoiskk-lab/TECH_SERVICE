"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dict } from "@/i18n";

type DayStatus = "available" | "full" | "unavailable";

/**
 * Month calendar with live day status from /api/calendar. Available days are
 * selectable; fully booked and unavailable days are shown but disabled.
 */
export function BookingCalendar({
  t,
  packageId,
  duration,
  selected,
  minDate,
  maxDate,
  onSelect,
  refreshKey,
}: {
  t: Dict;
  packageId: string;
  duration: number;
  selected: string;
  minDate: string;
  maxDate: string;
  onSelect: (date: string) => void;
  refreshKey?: number;
}) {
  const [month, setMonth] = useState(selected.slice(0, 7) || minDate.slice(0, 7));
  const [data, setData] = useState<{ key: string; days: Record<string, DayStatus> } | null>(null);
  const key = `${packageId}|${duration}|${month}|${refreshKey ?? 0}`;
  const days = data?.key === key ? data.days : null;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/calendar?month=${month}&packageId=${encodeURIComponent(packageId)}&duration=${duration}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<{ days?: Record<string, DayStatus> }>)
      .then((j) => !cancelled && setData({ key, days: j.days ?? {} }))
      .catch(() => !cancelled && setData({ key, days: {} }));
    return () => {
      cancelled = true;
    };
  }, [key, month, packageId, duration]);

  const grid = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0 = Sunday
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells: (string | null)[] = Array.from({ length: (first + 6) % 7 }, () => null); // Monday first
    for (let d = 1; d <= count; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
    return cells;
  }, [month]);

  const shift = (n: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };
  const label = new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
  const canPrev = month > minDate.slice(0, 7);
  const canNext = month < maxDate.slice(0, 7);

  return (
    <div className="rounded-2xl border border-line p-3 sm:p-4" data-testid="calendar">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="ts-btn ts-btn-ghost h-11 w-11 !p-0" onClick={() => shift(-1)} disabled={!canPrev} aria-label={t.book.prevMonth}>
          ‹
        </button>
        <p className="font-heading text-lg" aria-live="polite">
          {label}
        </p>
        <button type="button" className="ts-btn ts-btn-ghost h-11 w-11 !p-0" onClick={() => shift(1)} disabled={!canNext} aria-label={t.book.nextMonth}>
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-faint" aria-hidden="true">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1" role="grid" aria-label={label}>
        {grid.map((date, i) => {
          if (!date) return <span key={`e${i}`} />;
          const status: DayStatus = days?.[date] ?? "unavailable";
          const isSel = date === selected;
          const loading = !days;
          return (
            <button
              key={date}
              type="button"
              disabled={loading || status !== "available"}
              onClick={() => onSelect(date)}
              aria-pressed={isSel}
              aria-label={`${date}: ${t.book.calendarLegend[status]}`}
              data-date={date}
              data-status={status}
              className={`relative flex h-11 items-center justify-center rounded-xl text-sm tabular-nums transition ${
                isSel
                  ? "bg-gold font-semibold text-on-gold"
                  : status === "available"
                    ? "border border-line bg-card text-text hover:border-gold"
                    : status === "full"
                      ? "bg-raised text-faint line-through"
                      : "text-faint/60"
              }`}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-line bg-card" />
          {t.book.calendarLegend.available}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-raised" />
          {t.book.calendarLegend.full}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-dashed border-line" />
          {t.book.calendarLegend.unavailable}
        </span>
      </div>
    </div>
  );
}
