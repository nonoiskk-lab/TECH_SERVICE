import { db } from "@/server/db";
import { addDays, istDateTime, istToday } from "@/server/slots/time";
import { createBlockAction, deleteBlockAction } from "@/server/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, fmtTime, H1, Status } from "@/components/admin/ui";
import { getPackage } from "@/config/packages";

export default async function SlotsPage({
  searchParams,
}: PageProps<"/admin/slots">) {
  const sp = await searchParams;
  const date =
    typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)
      ? sp.date
      : istToday();
  const from = istDateTime(date, "00:00");
  const to = istDateTime(addDays(date, 1), "00:00");
  const [bookings, blocks, holds] = await Promise.all([
    db.booking.findMany({
      where: {
        start: { lt: to },
        end: { gt: from },
        status: {
          in: [
            "pending_payment",
            "confirmed",
            "checked_in",
            "in_progress",
            "completed",
          ],
        },
      },
      orderBy: { start: "asc" },
    }),
    db.slotBlock.findMany({
      where: { start: { lt: to }, end: { gt: from } },
      orderBy: { start: "asc" },
    }),
    db.hold.findMany({
      where: {
        start: { lt: to },
        end: { gt: from },
        expiresAt: { gt: new Date() },
      },
    }),
  ]);
  const resources = await db.resource.findMany();
  const rules = (r: string) =>
    resources.find((x) => x.id === r) ?? {
      openTime: "10:00",
      closeTime: "22:00",
      bufferMinutes: 30,
    };
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <H1>Slots on {date}</H1>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/admin/slots?date=${addDays(date, -1)}`}
            className="ts-btn ts-btn-ghost text-sm"
            aria-label="Previous day"
          >
            ‹
          </a>
          <a href="/admin/slots" className="ts-btn ts-btn-ghost text-sm">
            Today
          </a>
          <a
            href={`/admin/slots?date=${addDays(date, 1)}`}
            className="ts-btn ts-btn-ghost text-sm"
            aria-label="Next day"
          >
            ›
          </a>
          <form className="flex gap-2">
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="ts-input w-auto"
              aria-label="Date"
            />
            <button className="ts-btn ts-btn-ghost text-sm">Show</button>
          </form>
        </div>
      </div>
      <Card title="Both spaces at a glance" testId="schedule">
        <div className="space-y-5">
          {(["room", "studio"] as const).map((r) => {
            const rule = rules(r);
            const open = istDateTime(date, rule.openTime).getTime();
            const close = istDateTime(date, rule.closeTime).getTime();
            const span = Math.max(1, close - open);
            const pct = (t: number) =>
              Math.min(100, Math.max(0, ((t - open) / span) * 100));
            // Pending bookings occupy the calendar only through their active hold; an expired one is not drawn.
            const pendingByHold = new Map(
              bookings
                .filter((b) => b.status === "pending_payment" && b.holdId)
                .map((b) => [b.holdId!, b]),
            );
            const items = [
              ...bookings
                .filter(
                  (b) => b.resource === r && b.status !== "pending_payment",
                )
                .map((b) => ({
                  k: b.id,
                  s: b.start.getTime(),
                  e: b.end.getTime(),
                  kind: "booking" as const,
                  st: b.status,
                  href: `/admin/bookings/${b.id}`,
                  label: b.id,
                  time: fmtTime(b.start),
                })),
              ...blocks
                .filter((b) => b.resource === r)
                .map((b) => ({
                  k: b.id,
                  s: b.start.getTime(),
                  e: b.end.getTime(),
                  kind: "block" as const,
                  st: "blocked",
                  href: "",
                  label: b.reason,
                  time: fmtTime(b.start),
                })),
              ...holds
                .filter((h) => h.resource === r)
                .map((h) => {
                  const pb = pendingByHold.get(h.id);
                  return {
                    k: h.id,
                    s: h.start.getTime(),
                    e: h.end.getTime(),
                    kind: "hold" as const,
                    st: pb ? "awaiting payment" : "held",
                    href: pb ? `/admin/bookings/${pb.id}` : "",
                    label: pb
                      ? `${pb.id} · awaiting payment`
                      : "Held in checkout",
                    time: fmtTime(h.start),
                  };
                }),
            ];
            const busy = bookings
              .filter((b) => b.resource === r && b.status !== "pending_payment")
              .reduce(
                (m, b) =>
                  m +
                  Math.max(
                    0,
                    Math.min(b.end.getTime(), close) -
                      Math.max(b.start.getTime(), open),
                  ),
                0,
              );
            const hours = Array.from(
              { length: Math.floor(span / 3600_000) + 1 },
              (_, i) => open + i * 3600_000,
            );
            return (
              <div key={r} data-testid={`schedule-${r}`}>
                <div className="mb-1 flex justify-between text-sm">
                  <strong>{r === "room" ? "Theatre room" : "Studio"}</strong>
                  <span className="text-muted" data-testid={`occupancy-${r}`}>
                    {Math.round((busy / span) * 100)}% booked · {rule.openTime}–
                    {rule.closeTime}
                  </span>
                </div>
                <div
                  className="relative h-16 overflow-hidden rounded-xl border border-line bg-raised"
                  role="img"
                  aria-label={`${r} schedule for ${date}`}
                >
                  {hours.map((h) => (
                    <span
                      key={h}
                      className="absolute inset-y-0 border-l border-line/60"
                      style={{ left: `${pct(h)}%` }}
                      aria-hidden="true"
                    />
                  ))}
                  {items.map((x) => {
                    const style = {
                      left: `${pct(x.s)}%`,
                      width: `${Math.max(0.8, pct(x.e) - pct(x.s))}%`,
                    };
                    const cls =
                      x.kind === "block"
                        ? "bg-[repeating-linear-gradient(45deg,var(--ts-line),var(--ts-line)_6px,transparent_6px,transparent_12px)] text-muted"
                        : x.kind === "hold"
                          ? "border border-dashed border-gold bg-gold/10 text-warm"
                          : "bg-gold text-on-gold";
                    // Two short lines (time, then ID/reason); both truncate so narrow blocks never overlap their neighbours.
                    const inner =
                      x.e - x.s < 45 * 60_000 ? (
                        <span className="sr-only">{`${x.time} ${x.label}`}</span>
                      ) : (
                        <span className="block overflow-hidden px-1.5 py-1 text-[11px] font-semibold leading-tight">
                          <span className="block truncate">{x.time}</span>
                          <span className="block truncate font-normal opacity-80">
                            {x.label}
                          </span>
                        </span>
                      );
                    return (
                      <span key={x.k} className="contents">
                        {x.kind === "booking" && (
                          <span
                            className="absolute inset-y-1 bg-[var(--ts-line)]/50"
                            style={{
                              left: `${pct(x.e)}%`,
                              width: `${Math.max(0, pct(x.e + rule.bufferMinutes * 60_000) - pct(x.e))}%`,
                            }}
                            title="Cleaning / reset gap"
                            aria-hidden="true"
                          />
                        )}
                        {x.href ? (
                          <a
                            href={x.href}
                            className={`absolute inset-y-1 rounded-md ${cls}`}
                            style={style}
                            title={`${x.time} ${x.label} · ${x.st}`}
                            data-testid="schedule-booking"
                          >
                            {inner}
                          </a>
                        ) : (
                          <span
                            className={`absolute inset-y-1 rounded-md ${cls}`}
                            style={style}
                            title={`${x.time} ${x.label} · ${x.st}`}
                          >
                            {inner}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
                <div
                  className="relative mt-1 h-4 text-[10px] text-faint"
                  aria-hidden="true"
                >
                  {hours.map((h, i) =>
                    i % 2 === 0 ? (
                      <span
                        key={h}
                        className={`absolute whitespace-nowrap ${i === 0 ? "" : i === hours.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
                        style={{ left: `${pct(h)}%` }}
                      >
                        {fmtTime(new Date(h))}
                      </span>
                    ) : null,
                  )}
                </div>
              </div>
            );
          })}
          <p className="flex flex-wrap gap-4 text-xs text-muted">
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded bg-gold align-middle" />
              Booked
            </span>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded border border-dashed border-gold bg-gold/10 align-middle" />
              Held in checkout / awaiting payment
            </span>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded bg-[var(--ts-line)] align-middle" />
              Blocked / cleaning gap
            </span>
          </p>
        </div>
      </Card>
      <div className="h-4" />
      <div className="grid gap-4 lg:grid-cols-2">
        {(["room", "studio"] as const).map((r) => (
          <Card
            key={r}
            title={
              r === "room"
                ? "Private room (Watch / Celebrate)"
                : "Studio (Podcast / Creator / Visit)"
            }
          >
            <ul className="space-y-2 text-sm" data-testid={`timeline-${r}`}>
              {[
                ...bookings
                  .filter(
                    (b) =>
                      b.resource === r &&
                      (b.status !== "pending_payment" ||
                        holds.some((h) => h.id === b.holdId)),
                  )
                  .map((b) => ({
                    k: b.id,
                    s: b.start,
                    e: b.end,
                    label: `${b.id} · ${getPackage(b.packageId)?.name.en ?? ""}`,
                    st: b.status,
                    blockId: "",
                  })),
                ...blocks
                  .filter((b) => b.resource === r)
                  .map((b) => ({
                    k: b.id,
                    s: b.start,
                    e: b.end,
                    label: `Blocked: ${b.reason}`,
                    st: "blocked",
                    blockId: b.id,
                  })),
                ...holds
                  .filter((h) => h.resource === r)
                  .map((h) => ({
                    k: h.id,
                    s: h.start,
                    e: h.end,
                    label: "Held in checkout",
                    st: "held",
                    blockId: "",
                  })),
              ]
                .sort((a, b) => a.s.getTime() - b.s.getTime())
                .map((x) => (
                  <li
                    key={x.k}
                    className="flex items-center justify-between gap-2 border-b border-line/50 pb-2"
                  >
                    <span>
                      <strong>
                        {fmtTime(x.s)}–{fmtTime(x.e)}
                      </strong>{" "}
                      {x.label}
                    </span>
                    {x.blockId ? (
                      <form action={deleteBlockAction}>
                        <input type="hidden" name="blockId" value={x.blockId} />
                        <button className="text-xs text-danger underline">
                          Unblock
                        </button>
                      </form>
                    ) : (
                      <Status value={x.st} />
                    )}
                  </li>
                ))}
            </ul>
          </Card>
        ))}
        <Card title="Block time" testId="block-form">
          <ActionForm action={createBlockAction} submit="Block">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Space">
                <select name="resource" className="ts-input">
                  <option value="room">Private room</option>
                  <option value="studio">Studio</option>
                </select>
              </Field>
              <Field label="Date">
                <input
                  type="date"
                  name="date"
                  defaultValue={date}
                  className="ts-input"
                />
              </Field>
              <Field label="From">
                <input
                  type="time"
                  name="from"
                  defaultValue="10:00"
                  className="ts-input"
                />
              </Field>
              <Field label="To">
                <input
                  type="time"
                  name="to"
                  defaultValue="12:00"
                  className="ts-input"
                />
              </Field>
            </div>
            <Field label="Reason">
              <input
                name="reason"
                className="ts-input"
                placeholder="Maintenance, deep clean, private event"
              />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
