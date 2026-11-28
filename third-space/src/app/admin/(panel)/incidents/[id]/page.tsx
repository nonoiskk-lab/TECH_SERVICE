import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { updateIncidentAction } from "@/server/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, fmtDateTime, H1, Status } from "@/components/admin/ui";

export default async function IncidentDetail({ params }: PageProps<"/admin/incidents/[id]">) {
  const { id } = await params;
  const i = await db.incident.findUnique({ where: { id } });
  if (!i) notFound();
  return (
    <>
      <div className="mb-2 flex items-center gap-3">
        <H1>Incident · {fmtDateTime(i.occurredAt)}</H1>
        <Status value={i.status} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Record" testId="incident-record">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Booking</dt>
            <dd>{i.bookingId ? <Link className="underline" href={`/admin/bookings/${i.bookingId}`}>{i.bookingId}</Link> : "None"}</dd>
            <dt className="text-muted">Category</dt>
            <dd>{i.category.replace("_", " ")}</dd>
            <dt className="text-muted">Severity</dt>
            <dd>{i.severity}</dd>
            <dt className="text-muted">Session stopped</dt>
            <dd>{i.sessionStopped ? "Yes" : "No"}</dd>
            <dt className="text-muted">Evidence preserved</dt>
            <dd>{i.evidencePreserved ? "Yes" : "No"}</dd>
            <dt className="text-muted">Authorities contacted</dt>
            <dd>{i.authoritiesContacted ? "Yes" : "No"}</dd>
            <dt className="text-muted">Reported by</dt>
            <dd>{i.reportedBy}</dd>
          </dl>
          <h3 className="mt-4 font-semibold">What happened</h3>
          <p className="whitespace-pre-wrap text-sm text-muted">{i.description}</p>
          {i.witnesses && (
            <>
              <h3 className="mt-4 font-semibold">Witnesses</h3>
              <p className="whitespace-pre-wrap text-sm text-muted">{i.witnesses}</p>
            </>
          )}
          <h3 className="mt-4 font-semibold">Actions taken</h3>
          <p className="whitespace-pre-wrap text-sm text-muted">{i.actionsTaken || "None yet."}</p>
        </Card>
        {i.status === "open" && (
          <Card title="Add an update">
            <ActionForm action={updateIncidentAction} submit="Save update">
              <input type="hidden" name="incidentId" value={i.id} />
              <Field label="Note (appended, never overwritten)">
                <textarea name="note" className="ts-input min-h-20" />
              </Field>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" name="evidencePreserved" className="h-5 w-5" /> Evidence preserved
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" name="authoritiesContacted" className="h-5 w-5" /> Authorities contacted
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" name="close" className="h-5 w-5" /> Close this incident
              </label>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
