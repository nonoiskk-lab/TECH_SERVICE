import { db } from "@/server/db";
import { requireRole } from "@/server/admin/auth";
import { membershipUsageAction } from "@/server/admin/manage";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, H1, Status } from "@/components/admin/ui";

export default async function MembershipsPage() {
  await requireRole("memberships");
  const rows = await db.creatorMembership.findMany({ orderBy: { createdAt: "desc" }, include: { customer: true, usage: { orderBy: { createdAt: "desc" }, take: 5 } } });
  return (
    <>
      <H1>Monthly Creator Plans</H1>
      <div className="grid gap-4 lg:grid-cols-2" data-testid="membership-rows">
        {rows.map((m) => {
          const left = m.hoursTotal * 60 - m.minutesUsed;
          return (
            <Card key={m.id} title={`${m.customer.name} · ${m.customer.phone}`}>
              <p className="text-sm">
                <strong>{Math.floor(left / 60)}h {left % 60}m</strong> left of {m.hoursTotal}h · valid until {m.validUntil.toISOString().slice(0, 10)} <Status value={m.status === "active" ? "active" : "hidden"} />
              </p>
              <ul className="mt-2 text-xs text-muted">
                {m.usage.map((u) => (
                  <li key={u.id}>
                    {u.createdAt.toISOString().slice(0, 10)} · {u.minutes} min · {u.note} · {u.recordedBy}
                  </li>
                ))}
              </ul>
              {m.status === "active" && left > 0 && (
                <ActionForm action={membershipUsageAction} submit="Record use" className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="membershipId" value={m.id} />
                  <Field label="Minutes used">
                    <input name="minutes" type="number" min={15} max={left} step={15} defaultValue={Math.min(120, left)} className="ts-input w-28" />
                  </Field>
                  <Field label="Booking ID (optional)">
                    <input name="bookingId" className="ts-input w-36" />
                  </Field>
                  <Field label="Note">
                    <input name="note" className="ts-input w-40" />
                  </Field>
                </ActionForm>
              )}
            </Card>
          );
        })}
        {rows.length === 0 && <p className="text-sm text-muted">No Creator Plans sold yet. A plan starts when its booking is confirmed.</p>}
      </div>
    </>
  );
}
