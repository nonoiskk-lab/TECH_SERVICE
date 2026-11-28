import Link from "next/link";
import { db } from "@/server/db";
import { requireRole } from "@/server/admin/auth";
import { addDays, istDateTime, istToday } from "@/server/slots/time";
import { checklistNoteAction, toggleChecklistAction } from "@/server/checklist-actions";
import { CHECKLIST_ITEMS, checklistKey, dayClosed, doneCount, parseChecklist } from "@/lib/checklist";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, fmtTime, H1 } from "@/components/admin/ui";
import { StatusBadge } from "@/components/status-badge";
import { formatINR } from "@/lib/pricing";

export default async function ChecklistPage({ searchParams }: PageProps<"/staff/checklist">) {
  await requireRole("checkin");
  const sp = await searchParams;
  const today = istToday();
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) && sp.date <= today ? sp.date : today;
  const editable = date === today;
  const from = istDateTime(date, "00:00");
  const to = istDateTime(addDays(date, 1), "00:00");
  const [row, bookings, incidents, collected] = await Promise.all([
    db.setting.findUnique({ where: { key: checklistKey(date) } }),
    db.booking.findMany({ where: { start: { gte: from, lt: to } }, orderBy: { start: "asc" } }),
    db.incident.count({ where: { occurredAt: { gte: from, lt: to } } }),
    db.payment.aggregate({ where: { status: "captured", kind: { in: ["advance", "full", "balance"] }, createdAt: { gte: from, lt: to } }, _sum: { amount: true } }),
  ]);
  const state = parseChecklist(row?.value);
  const count = (s: string[]) => bookings.filter((b) => s.includes(b.status)).length;
  const closed = dayClosed(state);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <H1>Daily report and checklist</H1>
        <nav aria-label="Day" className="flex gap-2 text-sm">
          <Link className="ts-btn ts-btn-ghost" href={`/staff/checklist?date=${addDays(date, -1)}`}>
            ← Previous day
          </Link>
          {!editable && (
            <Link className="ts-btn ts-btn-ghost" href="/staff/checklist">
              Today
            </Link>
          )}
        </nav>
      </div>
      <p className="mb-4 flex items-center gap-3 text-sm text-muted">
        {date}
        <StatusBadge status={closed ? "completed" : "pending"} label={closed ? "Day closed" : `${doneCount(state)} of ${CHECKLIST_ITEMS.length} done`} testId="checklist-state" />
        {!editable && <span>(read only)</span>}
      </p>
      <div className="space-y-4">
        <Card title="Checklist" testId="checklist">
          <ul className="divide-y divide-line">
            {CHECKLIST_ITEMS.map((i) => {
              const done = state.items[i.id];
              return (
                <li key={i.id} className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2" data-testid="checklist-item" data-item={i.id} data-done={!!done}>
                  <span>
                    <span className="font-semibold">{i.label}</span>
                    {done && (
                      <span className="block text-sm text-muted">
                        Done by {done.by} at {fmtTime(new Date(done.at))}
                      </span>
                    )}
                  </span>
                  {editable ? (
                    <form action={toggleChecklistAction}>
                      <input type="hidden" name="date" value={date} />
                      <input type="hidden" name="item" value={i.id} />
                      <button className={`ts-btn text-sm ${done ? "ts-btn-ghost" : "ts-btn-primary"}`} aria-pressed={!!done} data-testid={`toggle-${i.id}`}>
                        {done ? "Undo" : "Mark done"}
                      </button>
                    </form>
                  ) : (
                    <StatusBadge status={done ? "completed" : "pending"} label={done ? "Done" : "Not done"} />
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
        <Card title="Daily report" testId="daily-report">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="ts-stat">
              <dt>Live bookings</dt>
              <dd data-testid="report-live">{count(["confirmed", "checked_in", "in_progress", "completed"])}</dd>
            </div>
            <div className="ts-stat">
              <dt>Completed</dt>
              <dd data-testid="report-completed">{count(["completed"])}</dd>
            </div>
            <div className="ts-stat">
              <dt>No-shows</dt>
              <dd data-testid="report-noshow">{count(["no_show"])}</dd>
            </div>
            <div className="ts-stat">
              <dt>Incidents</dt>
              <dd data-testid="report-incidents">{incidents}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-muted">Payments received that day: {formatINR(collected._sum.amount ?? 0)}</p>
          {editable ? (
            <ActionForm action={checklistNoteAction} submit="Save note" className="mt-4 space-y-2" testId="report-note-form">
              <input type="hidden" name="date" value={date} />
              <Field label="End of day note (visible to managers)">
                <textarea name="note" rows={3} maxLength={500} defaultValue={state.note} className="ts-input" data-testid="report-note" />
              </Field>
            </ActionForm>
          ) : (
            state.note && <p className="mt-4 whitespace-pre-wrap text-sm">{state.note}</p>
          )}
        </Card>
      </div>
    </>
  );
}
