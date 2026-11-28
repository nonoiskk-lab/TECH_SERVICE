import Link from "next/link";
import type { Booking } from "@prisma/client";
import { getPackage } from "@/config/packages";
import { blockGeometry, laneOf, LANES, type Lane } from "@/lib/day-lanes";
import { fmtTime } from "./ui";
import { StatusBadge } from "@/components/status-badge";

/** Pixels per minute: a two-hour session is 96 px tall, the whole 10 AM to 10 PM day 576 px. */
const SCALE = 0.8;
const LABEL: Record<Lane, string> = { theatre: "Theatre", podcast: "Podcast", studio: "Studio" };

/**
 * Day calendar for the staff dashboard: three lanes (Theatre, Podcast, Studio), one Booking Block per booking in
 * its mode colour. One minute is 0.8 px, so a two-hour session is 96 px tall. Blocks link to the booking.
 */
export function DayLanes({ rows, openMin = 600, closeMin = 1320 }: { rows: Booking[]; openMin?: number; closeMin?: number }) {
  const height = (closeMin - openMin) * SCALE;
  const hoursShown: number[] = [];
  for (let m = openMin; m <= closeMin; m += 120) hoursShown.push(m);
  const label = (m: number) => `${((Math.floor(m / 60) + 11) % 12) + 1} ${m / 60 < 12 ? "AM" : "PM"}`;
  const byLane = (l: Lane) => rows.filter((b) => laneOf(b.packageId, b.resource) === l);
  return (
    <div className="overflow-x-auto" data-testid="day-lanes" role="region" aria-label="Day calendar: three lanes, scroll sideways on a small screen" tabIndex={0}>
      <div className="grid min-w-[420px] grid-cols-[44px_repeat(3,1fr)] gap-2">
        <div />
        {LANES.map((l) => (
          <p key={l} className="t-label flex items-center gap-2" data-testid={`lane-title-${l}`}>
            <span className="ts-dot" data-mode={l} aria-hidden="true" />
            {LABEL[l]}
          </p>
        ))}
        <div className="relative" style={{ height }} aria-hidden="true">
          {hoursShown.map((m) => (
            <span key={m} className="t-caption absolute right-1 -translate-y-1/2 text-muted" style={{ top: (m - openMin) * SCALE }}>
              {label(m)}
            </span>
          ))}
        </div>
        {LANES.map((l) => (
          <div key={l} className="relative rounded-lg border border-line bg-raised" style={{ height }} data-testid={`lane-${l}`}>
            {hoursShown.map((m) => (
              <span key={m} className="absolute inset-x-0 border-t border-line" style={{ top: (m - openMin) * SCALE }} aria-hidden="true" />
            ))}
            {byLane(l).map((b) => {
              const g = blockGeometry(b.start, b.end, openMin, closeMin);
              if (!g) return null;
              return (
                <Link
                  key={b.id}
                  href={`/admin/bookings/${b.id}`}
                  className="absolute inset-x-1 overflow-hidden rounded-md border-l-4 bg-card px-2 py-1 text-left shadow-sm hover:shadow-md"
                  style={{ top: g.top * SCALE, height: g.height * SCALE, borderLeftColor: `var(--ts-mode-${l})` }}
                  data-testid="booking-block"
                  data-lane={l}
                  data-status={b.status}
                >
                  <span className="t-caption block font-semibold" style={{ color: `var(--ts-mode-${l}-text)` }}>
                    {fmtTime(b.start)} – {fmtTime(b.end)}
                  </span>
                  <span className="t-caption block truncate">
                    {b.guestName} · {getPackage(b.packageId)?.name.en ?? b.packageId}
                  </span>
                  {g.height * SCALE >= 56 && <StatusBadge status={b.status} />}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
