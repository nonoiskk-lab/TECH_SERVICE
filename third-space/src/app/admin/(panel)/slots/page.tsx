import { db } from "@/server/db";
import { addDays, istDateTime, istToday } from "@/server/slots/time";
import { createBlockAction, deleteBlockAction } from "@/server/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, fmtTime, H1, Status } from "@/components/admin/ui";
import { getPackage } from "@/config/packages";

export default async function SlotsPage({ searchParams }: PageProps<"/admin/slots">) {
  const sp = await searchParams;
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : istToday();
  const from = istDateTime(date, "00:00");
  const to = istDateTime(addDays(date, 1), "00:00");
  const [bookings, blocks, holds] = await Promise.all([
    db.booking.findMany({ where: { start: { lt: to }, end: { gt: from }, status: { in: ["confirmed", "checked_in", "completed"] } }, orderBy: { start: "asc" } }),
    db.slotBlock.findMany({ where: { start: { lt: to }, end: { gt: from } }, orderBy: { start: "asc" } }),
    db.hold.findMany({ where: { start: { lt: to }, end: { gt: from }, expiresAt: { gt: new Date() } } }),
  ]);
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <H1>Slots on {date}</H1>
        <form className="flex gap-2">
          <input type="date" name="date" defaultValue={date} className="ts-input w-auto" aria-label="Date" />
          <button className="ts-btn ts-btn-ghost text-sm">Show</button>
        </form>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(["room", "studio"] as const).map((r) => (
          <Card key={r} title={r === "room" ? "Private room (Watch / Celebrate)" : "Studio (Podcast / Creator / Visit)"}>
            <ul className="space-y-2 text-sm" data-testid={`timeline-${r}`}>
              {[
                ...bookings.filter((b) => b.resource === r).map((b) => ({ k: b.id, s: b.start, e: b.end, label: `${b.id} · ${getPackage(b.packageId)?.name.en ?? ""}`, st: b.status, blockId: "" })),
                ...blocks.filter((b) => b.resource === r).map((b) => ({ k: b.id, s: b.start, e: b.end, label: `Blocked: ${b.reason}`, st: "blocked", blockId: b.id })),
                ...holds.filter((h) => h.resource === r).map((h) => ({ k: h.id, s: h.start, e: h.end, label: "Held in checkout", st: "held", blockId: "" })),
              ]
                .sort((a, b) => a.s.getTime() - b.s.getTime())
                .map((x) => (
                  <li key={x.k} className="flex items-center justify-between gap-2 border-b border-line/50 pb-2">
                    <span>
                      <strong>
                        {fmtTime(x.s)}–{fmtTime(x.e)}
                      </strong>{" "}
                      {x.label}
                    </span>
                    {x.blockId ? (
                      <form action={deleteBlockAction}>
                        <input type="hidden" name="blockId" value={x.blockId} />
                        <button className="text-xs text-danger underline">Unblock</button>
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
                <input type="date" name="date" defaultValue={date} className="ts-input" />
              </Field>
              <Field label="From">
                <input type="time" name="from" defaultValue="10:00" className="ts-input" />
              </Field>
              <Field label="To">
                <input type="time" name="to" defaultValue="12:00" className="ts-input" />
              </Field>
            </div>
            <Field label="Reason">
              <input name="reason" className="ts-input" placeholder="Maintenance, deep clean, private event" />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
