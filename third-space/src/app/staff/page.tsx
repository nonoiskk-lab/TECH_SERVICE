import Link from "next/link";
import { db } from "@/server/db";
import { requireRole } from "@/server/admin/auth";
import { addDays, istDateTime, istToday } from "@/server/slots/time";
import { Card, fmtTime, H1, Status } from "@/components/admin/ui";
import { formatINR } from "@/lib/pricing";

const LIVE = ["confirmed", "checked_in", "in_progress", "completed", "no_show"];

export default async function StaffToday({ searchParams }: PageProps<"/staff">) {
  const me = await requireRole("checkin");
  const sp = await searchParams;
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : istToday();
  const mineOnly = sp.view === "mine";
  const from = istDateTime(date, "00:00");
  const to = istDateTime(addDays(date, 1), "00:00");
  const rows = await db.booking.findMany({
    where: { start: { gte: from, lt: to }, status: { in: LIVE }, ...(mineOnly && me.id !== "bootstrap" ? { assignedStaffId: me.id } : {}) },
    orderBy: { start: "asc" },
    include: { assignedStaff: { select: { name: true } } },
  });
  const link = (q: Record<string, string>) => `/staff?${new URLSearchParams({ date, ...(mineOnly ? { view: "mine" } : {}), ...q }).toString()}`;
  return (
    <>
      <H1>{date === istToday() ? "Today" : date}</H1>
      <nav aria-label="Day and filter" className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link className="ts-btn ts-btn-ghost" href={`/staff?date=${addDays(date, -1)}${mineOnly ? "&view=mine" : ""}`}>
          ← Previous day
        </Link>
        <Link className="ts-btn ts-btn-ghost" href={`/staff?date=${addDays(date, 1)}${mineOnly ? "&view=mine" : ""}`}>
          Next day →
        </Link>
        <Link className="ts-btn ts-btn-ghost" aria-current={!mineOnly} href={`/staff?date=${date}`}>
          All
        </Link>
        <Link className="ts-btn ts-btn-ghost" aria-current={mineOnly} href={link({ view: "mine" })} data-testid="staff-mine">
          My bookings
        </Link>
      </nav>
      <ul className="space-y-3" data-testid="staff-rows">
        {rows.map((b) => (
          <li key={b.id}>
            <Link href={`/staff/${b.id}`} className="block" data-testid="staff-row">
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-lg">
                    {fmtTime(b.start)} – {fmtTime(b.end)}
                  </strong>
                  <Status value={b.status} />
                </div>
                <p className="mt-1 text-sm">
                  {b.resource === "studio" ? "Studio" : "Private Theatre"} · {b.packageName || b.packageId} · {b.guestName} · {b.guestCount} guest{b.guestCount === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {b.roomReadyAt ? "Room ready" : ["confirmed", "checked_in"].includes(b.status) ? "Room not ready yet" : ""}
                  {b.assignedStaff ? ` · Assigned to ${b.assignedStaff.name}` : " · Unassigned"}
                  {b.balanceDue > 0 && b.status !== "no_show" ? ` · Balance at venue ${formatINR(b.balanceDue)}` : ""}
                </p>
              </Card>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-muted">No bookings {mineOnly ? "assigned to you " : ""}on this day.</li>}
      </ul>
    </>
  );
}
