"use client";

import { useActionState, useEffect, useState } from "react";
import { guestRescheduleAction } from "@/server/guest-actions";

type Slot = { start: string; end: string; status: string };
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** Pick a new free slot for an existing booking (same package and length). Live data from /api/availability. */
export function RescheduleForm({
  bookingId,
  token,
  packageId,
  duration,
  minDate,
  maxDate,
  labels,
}: {
  bookingId: string;
  token: string;
  packageId: string;
  duration: number;
  minDate: string;
  maxDate: string;
  labels: { date: string; pick: string; none: string; submit: string; loading: string };
}) {
  const [state, action, pending] = useActionState(guestRescheduleAction, undefined);
  const [date, setDate] = useState("");
  const [data, setData] = useState<{ date: string; slots: Slot[] } | null>(null);
  const [start, setStart] = useState("");
  const slots = data?.date === date ? data.slots : null;

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    fetch(`/api/availability?date=${date}&packageId=${encodeURIComponent(packageId)}&duration=${duration}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<{ slots?: Slot[] }>)
      .then((j) => !cancelled && setData({ date, slots: j.slots ?? [] }))
      .catch(() => !cancelled && setData({ date, slots: [] }));
    return () => {
      cancelled = true;
    };
  }, [date, packageId, duration]);

  const free = (slots ?? []).filter((s) => s.status === "available");
  return (
    <form action={action} className="space-y-3" data-testid="reschedule-form">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="start" value={start} />
      <label className="block">
        <span className="mb-1 block text-sm text-muted">{labels.date}</span>
        <input
          type="date"
          className="ts-input"
          min={minDate}
          max={maxDate}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setStart("");
          }}
          data-testid="reschedule-date"
        />
      </label>
      {date && !slots && <p className="text-sm text-faint">{labels.loading}</p>}
      {slots && free.length === 0 && <p className="text-sm text-faint">{labels.none}</p>}
      {free.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm text-muted">{labels.pick}</legend>
          <div className="grid grid-cols-3 gap-2">
            {free.map((s) => (
              <button
                key={s.start}
                type="button"
                onClick={() => setStart(s.start)}
                aria-pressed={start === s.start}
                className={`min-h-11 rounded-xl border text-sm tabular-nums ${start === s.start ? "border-gold bg-gold font-semibold text-on-gold" : "border-line hover:border-gold"}`}
                data-testid="reschedule-slot"
              >
                {timeOf(s.start)}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button className="ts-btn ts-btn-primary w-full" disabled={!start || pending} data-testid="reschedule-submit">
        {labels.submit}
      </button>
    </form>
  );
}
