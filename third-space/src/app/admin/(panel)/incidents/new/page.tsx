import { createIncidentAction } from "@/server/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, H1 } from "@/components/admin/ui";
import { toIstIso } from "@/server/slots/time";

export default async function NewIncident({ searchParams }: PageProps<"/admin/incidents/new">) {
  const sp = await searchParams;
  const booking = typeof sp.booking === "string" ? sp.booking : "";
  const now = toIstIso(new Date()).slice(0, 16);
  return (
    <>
      <H1>Report incident</H1>
      <Card>
        <p className="mb-4 text-sm text-muted">
          Safety first: call 112 if anyone is in danger. Do not detain, search, punish or interrogate anyone. Record objective facts, witnesses and the actions
          taken. Preserve relevant CCTV and booking records.
        </p>
        <ActionForm action={createIncidentAction} submit="Save incident" testId="incident-form">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Booking ID (optional)">
              <input name="bookingId" defaultValue={booking} className="ts-input" />
            </Field>
            <Field label="When (IST)">
              <input type="datetime-local" name="occurredAt" defaultValue={now} className="ts-input" />
            </Field>
            <Field label="Category">
              <select name="category" className="ts-input">
                <option value="conduct">Conduct / threats / harassment</option>
                <option value="prohibited_item">Smoking, alcohol, drugs, weapons</option>
                <option value="content">Prohibited content</option>
                <option value="safety">Safety / fire</option>
                <option value="medical">Medical</option>
                <option value="property">Property damage</option>
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
          <Field label="What happened (objective facts)">
            <textarea name="description" className="ts-input min-h-28" data-testid="incident-description" />
          </Field>
          <Field label="Witnesses">
            <textarea name="witnesses" className="ts-input min-h-16" />
          </Field>
          <Field label="Actions taken">
            <textarea name="actionsTaken" className="ts-input min-h-16" />
          </Field>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" name="evidencePreserved" className="h-5 w-5" /> Relevant CCTV/booking records preserved
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" name="authoritiesContacted" className="h-5 w-5" /> Police / emergency services contacted
          </label>
        </ActionForm>
      </Card>
    </>
  );
}
