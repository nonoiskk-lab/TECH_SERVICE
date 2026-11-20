import { db } from "@/server/db";
import { requireRole } from "@/server/admin/auth";
import { createClosureAction, saveAssetAction, saveResourceAction } from "@/server/admin/manage";
import { packages } from "@/config/packages";
import { deleteBlockAction } from "@/server/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, fmtDateTime, H1 } from "@/components/admin/ui";
import { istToday } from "@/server/slots/time";

export default async function CalendarPage() {
  await requireRole("calendar");
  const [resources, closures, assets] = await Promise.all([
    db.resource.findMany({ orderBy: { sortOrder: "asc" } }),
    db.slotBlock.findMany({ where: { end: { gte: new Date() } }, orderBy: { start: "asc" }, take: 100 }),
    db.sharedAsset.findMany({ include: { packages: true } }),
  ]);
  return (
    <>
      <H1>Calendar & resources</H1>
      <div className="grid gap-4 lg:grid-cols-2">
        {resources.map((r) => (
          <Card key={r.id} title={r.name} testId={`resource-${r.id}`}>
            <ActionForm action={saveResourceAction} submit="Save">
              <input type="hidden" name="id" value={r.id} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Opens">
                  <input name="openTime" type="time" defaultValue={r.openTime} className="ts-input" />
                </Field>
                <Field label="Closes">
                  <input name="closeTime" type="time" defaultValue={r.closeTime} className="ts-input" />
                </Field>
                <Field label="Slot start every (min)">
                  <input name="slotStepMinutes" type="number" min={10} max={120} defaultValue={r.slotStepMinutes} className="ts-input" />
                </Field>
                <Field label="Cleaning / reset gap (min)">
                  <input name="bufferMinutes" type="number" min={0} max={120} defaultValue={r.bufferMinutes} className="ts-input" />
                </Field>
                <Field label="Bookable days ahead">
                  <input name="bookingWindowDays" type="number" min={1} max={365} defaultValue={r.bookingWindowDays} className="ts-input" />
                </Field>
              </div>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" name="active" defaultChecked={r.active} className="h-5 w-5" /> Taking bookings
              </label>
            </ActionForm>
          </Card>
        ))}
        <Card title="Close time: holiday, maintenance or private event" testId="closure-form">
          <ActionForm action={createClosureAction} submit="Save closure">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Space">
                <select name="resource" className="ts-input">
                  <option value="both">Both</option>
                  <option value="room">Private Theatre</option>
                  <option value="studio">Studio</option>
                </select>
              </Field>
              <Field label="Type">
                <select name="kind" className="ts-input">
                  <option value="holiday">Holiday (whole days)</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="event">Private event</option>
                </select>
              </Field>
              <Field label="From date">
                <input name="fromDate" type="date" defaultValue={istToday()} className="ts-input" />
              </Field>
              <Field label="To date">
                <input name="toDate" type="date" defaultValue={istToday()} className="ts-input" />
              </Field>
              <Field label="From time (not for holidays)">
                <input name="fromTime" type="time" defaultValue="10:00" className="ts-input" />
              </Field>
              <Field label="To time">
                <input name="toTime" type="time" defaultValue="12:00" className="ts-input" />
              </Field>
            </div>
            <Field label="Reason">
              <input name="reason" className="ts-input" />
            </Field>
          </ActionForm>
        </Card>
        <Card title="Upcoming closures">
          <ul className="space-y-1 text-sm">
            {closures.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 border-b border-line/50 pb-1">
                <span>
                  {c.resource === "room" ? "Theatre" : "Studio"} · {c.kind} · {fmtDateTime(c.start)} → {fmtDateTime(c.end)} · {c.reason}
                </span>
                <form action={deleteBlockAction}>
                  <input type="hidden" name="blockId" value={c.id} />
                  <button className="text-xs text-danger underline">Remove</button>
                </form>
              </li>
            ))}
            {closures.length === 0 && <li className="text-muted">None.</li>}
          </ul>
        </Card>
        <Card title="Shared staff and equipment">
          <p className="text-sm text-muted">
            The Theatre and the Studio can run at the same time. If a staff member or equipment item serves both, link it to the packages that need it and the
            engine blocks overlapping bookings across both spaces.
          </p>
          <ul className="mt-2 text-sm">
            {assets.map((a) => (
              <li key={a.id}>
                {a.name} ({a.kind}) → {a.packages.map((p) => p.packageId).join(", ") || "no packages"}
              </li>
            ))}
            {assets.length === 0 && <li className="text-faint">None configured.</li>}
          </ul>
          <ActionForm action={saveAssetAction} submit="Add shared item" className="mt-3 space-y-2" testId="asset-form">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Name">
                <input name="name" className="ts-input" placeholder="e.g. Sound engineer" />
              </Field>
              <Field label="Type">
                <select name="kind" className="ts-input">
                  <option value="staff">Staff</option>
                  <option value="equipment">Equipment</option>
                </select>
              </Field>
            </div>
            <p className="text-sm">Needed by:</p>
            <div className="flex flex-wrap gap-3 text-sm">
              {packages.map((p) => (
                <label key={p.id} className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" name="packageIds" value={p.id} className="h-5 w-5" /> {p.name.en}
                </label>
              ))}
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
