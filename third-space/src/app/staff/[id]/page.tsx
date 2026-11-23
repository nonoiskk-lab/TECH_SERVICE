import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireRole, can } from "@/server/admin/auth";
import { checkInAction } from "@/server/admin/actions";
import { roomReadyAction, staffIssueAction, staffNoteAction, staffProgressAction } from "@/server/staff-actions";
import { nextOpsActions } from "@/server/booking-state";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, fmtDateTime, fmtTime, H1, Status } from "@/components/admin/ui";
import { formatINR } from "@/lib/pricing";
import { durationText } from "@/lib/session";

export default async function StaffBooking({ params }: PageProps<"/staff/[id]">) {
  const me = await requireRole("checkin");
  const { id } = await params;
  const b = await db.booking.findUnique({ where: { id }, include: { assignedStaff: { select: { name: true } }, acceptance: true } });
  if (!b) notFound();
  const next = nextOpsActions(b.status).filter((s) => s === "in_progress" || s === "completed" || (s === "no_show" && b.start <= new Date()));
  const live = ["confirmed", "checked_in"].includes(b.status);
  return (
    <>
      <Link href="/staff" className="mb-3 inline-block text-sm text-muted">
        ← Today
      </Link>
      <H1>
        {fmtTime(b.start)} · {b.guestName}
      </H1>
      <div className="space-y-4">
        <Card title="Booking" testId="staff-booking">
          <p className="mb-2">
            <Status value={b.status} />
          </p>
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">When</dt>
            <dd>
              {fmtDateTime(b.start)} – {fmtTime(b.end)} ({durationText(b.durationMinutes)})
            </dd>
            <dt className="text-muted">Space</dt>
            <dd>{b.resource === "studio" ? "Studio" : "Private Theatre"}</dd>
            <dt className="text-muted">Package</dt>
            <dd>{b.packageName || b.packageId}</dd>
            <dt className="text-muted">Guests</dt>
            <dd>{b.guestCount}</dd>
            <dt className="text-muted">Contact</dt>
            <dd>
              {b.guestName} · <a href={`tel:+91${b.guestPhone}`}>{b.guestPhone}</a>
            </dd>
            <dt className="text-muted">Requests</dt>
            <dd>{b.specialRequests || "None"}</dd>
            <dt className="text-muted">Balance at venue</dt>
            <dd>{formatINR(b.balanceDue)}</dd>
            <dt className="text-muted">Assigned</dt>
            <dd>{b.assignedStaff?.name ?? "Nobody yet"}</dd>
            <dt className="text-muted">Declaration</dt>
            <dd>{b.acceptance ? "Accepted" : "Not on file"}</dd>
          </dl>
        </Card>

        <Card title="Room" testId="staff-room">
          {b.roomReadyAt ? (
            <p className="text-sm text-ok" data-testid="room-ready">
              Ready (marked by {b.roomReadyBy} at {fmtTime(b.roomReadyAt)})
            </p>
          ) : live ? (
            <form action={roomReadyAction}>
              <input type="hidden" name="bookingId" value={b.id} />
              <p className="mb-2 text-sm text-muted">Cleaned, set up and equipment checked.</p>
              <button className="ts-btn ts-btn-primary text-sm" data-testid="mark-room-ready">
                Mark room ready
              </button>
            </form>
          ) : (
            <p className="text-sm text-muted">Not applicable.</p>
          )}
        </Card>

        {b.status === "confirmed" && can(me.role, "checkin") && (
          <Card title="Check in (18+)">
            <ActionForm action={checkInAction} submit="Check in" className="space-y-3" testId="staff-checkin">
              <input type="hidden" name="bookingId" value={b.id} />
              <Field label={`Guests verified as 18+ (booked: ${b.guestCount})`}>
                <input name="ageVerifiedCount" type="number" min={1} max={b.guestCount} defaultValue={b.guestCount} className="ts-input w-28" />
              </Field>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="idSeen" className="mt-1" />I saw a valid photo ID showing 18+ for each guest.
              </label>
            </ActionForm>
          </Card>
        )}

        {next.length > 0 && (
          <Card title="Session">
            <div className="flex flex-wrap gap-2" data-testid="staff-progress">
              {next.map((s) => (
                <form key={s} action={staffProgressAction}>
                  <input type="hidden" name="bookingId" value={b.id} />
                  <input type="hidden" name="status" value={s} />
                  <button className="ts-btn ts-btn-ghost text-sm" data-testid={`progress-${s}`}>
                    {s === "in_progress" ? "Start session" : s === "completed" ? "Complete session" : "Mark no-show"}
                  </button>
                </form>
              ))}
            </div>
          </Card>
        )}

        <Card title="Notes" testId="staff-notes">
          {b.staffNotes ? <pre className="mb-3 whitespace-pre-wrap font-sans text-sm" data-testid="notes-log">{b.staffNotes}</pre> : <p className="mb-3 text-sm text-muted">No notes yet.</p>}
          <ActionForm action={staffNoteAction} submit="Add note" className="space-y-2">
            <input type="hidden" name="bookingId" value={b.id} />
            <Field label="Operational note (visible to staff and managers)">
              <input name="note" maxLength={500} className="ts-input" data-testid="note-input" />
            </Field>
          </ActionForm>
        </Card>

        {can(me.role, "incidents") && (
          <Card title="Report an issue" testId="staff-issue">
            <ActionForm action={staffIssueAction} submit="Report to manager" className="space-y-3">
              <input type="hidden" name="bookingId" value={b.id} />
              <div className="flex flex-wrap gap-3">
                <Field label="Category">
                  <select name="category" className="ts-input">
                    <option value="property">Property or equipment</option>
                    <option value="conduct">Guest conduct</option>
                    <option value="prohibited_item">Prohibited item</option>
                    <option value="content">Content</option>
                    <option value="safety">Safety</option>
                    <option value="medical">Medical</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Severity">
                  <select name="severity" className="ts-input" defaultValue="medium">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </Field>
              </div>
              <Field label="What happened (facts only)">
                <textarea name="description" rows={3} maxLength={2000} className="ts-input" data-testid="issue-description" />
              </Field>
            </ActionForm>
            <p className="mt-2 text-xs text-muted">To stop a session for safety or conduct, ask a manager: they use Stop session in Admin.</p>
          </Card>
        )}
      </div>
    </>
  );
}
