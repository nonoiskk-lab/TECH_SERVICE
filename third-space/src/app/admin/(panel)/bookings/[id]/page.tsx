import Link from "next/link";
import { notFound } from "next/navigation";
import { addOns, themes } from "@/config/site";
import { getPackage } from "@/config/packages";
import { db } from "@/server/db";
import { acceptanceCopy } from "@/lib/acceptance-copy";
import { formatINR, refundFor } from "@/lib/pricing";
import { balancePaidAction, cancelAction, checkInAction, setStatusAction, stopSessionAction } from "@/server/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, fmtDateTime, fmtTime, H1, hoursUntil, Status } from "@/components/admin/ui";

export default async function BookingDetail({ params }: PageProps<"/admin/bookings/[id]">) {
  const { id } = await params;
  const b = await db.booking.findUnique({
    where: { id },
    include: { acceptance: true, incidents: { orderBy: { createdAt: "desc" } }, notifications: true },
  });
  if (!b) notFound();
  const pkg = getPackage(b.packageId);
  const hoursBefore = hoursUntil(b.start);
  const suggestedRefund = refundFor(b.advancePaid, Math.max(0, hoursBefore));
  const active = !["cancelled", "stopped", "completed", "no_show"].includes(b.status);
  const logs = await db.auditLog.findMany({ where: { entity: "Booking", entityId: b.id }, orderBy: { at: "asc" } });

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <H1>
          {b.id} <span className="text-base font-semibold text-muted">· {pkg?.name.en ?? b.packageId}</span>
        </H1>
        <Status value={b.status} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Booking">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">When</dt>
            <dd>
              {fmtDateTime(b.start)} – {fmtTime(b.end)} ({b.resource})
            </dd>
            <dt className="text-muted">Guest</dt>
            <dd>
              {b.guestName} · <a className="underline" href={`tel:+91${b.guestPhone}`}>{b.guestPhone}</a> · {b.guestEmail}
            </dd>
            <dt className="text-muted">Guests</dt>
            <dd>{b.guestCount}</dd>
            {b.themeId && (
              <>
                <dt className="text-muted">Theme</dt>
                <dd>{themes.find((t) => t.id === b.themeId)?.name.en ?? b.themeId}</dd>
              </>
            )}
            <dt className="text-muted">Add-ons</dt>
            <dd>{b.addOnIds.map((a) => addOns.find((x) => x.id === a)?.name.en ?? a).join(", ") || "None"}</dd>
            <dt className="text-muted">Total</dt>
            <dd>{formatINR(b.total)}</dd>
            <dt className="text-muted">Advance paid</dt>
            <dd>
              {formatINR(b.advancePaid)} {b.paymentProvider && <span className="text-faint">({b.paymentProvider} {b.paymentId})</span>}
            </dd>
            <dt className="text-muted">Balance</dt>
            <dd data-testid="balance-state">{b.balanceDue === 0 ? "None" : b.balancePaidAt ? `${formatINR(b.balanceDue)} paid` : `${formatINR(b.balanceDue)} due at venue`}</dd>
            <dt className="text-muted">Age check</dt>
            <dd data-testid="age-state">{b.ageVerifiedCount != null ? `18+ verified for ${b.ageVerifiedCount} of ${b.guestCount} (by ${b.ageVerifiedBy})` : "Not checked in"}</dd>
            {b.cancelReason && (
              <>
                <dt className="text-muted">Cancelled</dt>
                <dd>
                  {b.cancelReason} · refund {formatINR(b.refundAmount ?? 0)}
                </dd>
              </>
            )}
          </dl>
        </Card>

        {b.status === "confirmed" && (
          <Card title="Check in" testId="checkin">
            <ActionForm action={checkInAction} submit="Check in">
              <input type="hidden" name="bookingId" value={b.id} />
              <p className="text-sm text-muted">Look at each guest&apos;s government photo ID. Do not copy or photograph it. Record only how many are 18+.</p>
              <Field label={`Guests verified as 18+ (booked: ${b.guestCount})`}>
                <input name="ageVerifiedCount" type="number" min={1} max={20} defaultValue={b.guestCount} className="ts-input w-28" data-testid="age-count" />
              </Field>
              <label className="flex min-h-11 items-start gap-3 text-sm">
                <input type="checkbox" name="idSeen" className="mt-1 h-5 w-5" data-testid="id-seen" />I saw a valid photo ID showing 18+ for each verified guest. Anyone not verified does not enter.
              </label>
            </ActionForm>
          </Card>
        )}

        {active && (
          <Card title="At the venue">
            <div className="flex flex-wrap gap-2">
              {b.balanceDue > 0 && !b.balancePaidAt && (
                <form action={balancePaidAction} className="flex gap-2">
                  <input type="hidden" name="bookingId" value={b.id} />
                  <select name="method" className="ts-input w-32" aria-label="Method">
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                  </select>
                  <button className="ts-btn ts-btn-primary text-sm" data-testid="balance-paid">
                    Balance {formatINR(b.balanceDue)} received
                  </button>
                </form>
              )}
              {b.status === "checked_in" && (
                <form action={setStatusAction}>
                  <input type="hidden" name="bookingId" value={b.id} />
                  <input type="hidden" name="status" value="completed" />
                  <button className="ts-btn ts-btn-ghost text-sm">Mark completed</button>
                </form>
              )}
              {b.status === "confirmed" && (
                <form action={setStatusAction}>
                  <input type="hidden" name="bookingId" value={b.id} />
                  <input type="hidden" name="status" value="no_show" />
                  <button className="ts-btn ts-btn-ghost text-sm">Mark no-show</button>
                </form>
              )}
            </div>
          </Card>
        )}

        {active && (
          <Card title="Stop session (rule breach or safety)" testId="stop">
            <ActionForm action={stopSessionAction} submit="Stop session and open incident" danger>
              <input type="hidden" name="bookingId" value={b.id} />
              <p className="text-sm text-muted">Safety first. Do not detain, search or argue. Call 112 if anyone is in danger. Write only what you saw.</p>
              <div className="grid gap-2 sm:grid-cols-2">
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
                <textarea name="description" className="ts-input min-h-24" />
              </Field>
            </ActionForm>
          </Card>
        )}

        {active && (
          <Card title="Cancel booking" testId="cancel">
            <ActionForm action={cancelAction} submit="Cancel booking" danger>
              <input type="hidden" name="bookingId" value={b.id} />
              <input type="hidden" name="suggested" value={suggestedRefund} />
              <p className="text-sm text-muted">
                {hoursBefore > 0 ? `${Math.floor(hoursBefore)} hours before start.` : "Start time has passed."} Refund tiers suggest{" "}
                <strong>{formatINR(suggestedRefund)}</strong> of the {formatINR(b.advancePaid)} advance.
              </p>
              <Field label="Reason">
                <input name="reason" className="ts-input" />
              </Field>
              <Field label="Refund amount (₹)">
                <input name="refundAmount" type="number" min={0} max={b.advancePaid} defaultValue={suggestedRefund} className="ts-input w-32" />
              </Field>
            </ActionForm>
          </Card>
        )}

        <Card title="Accepted declaration" testId="acceptance">
          {b.acceptance ? (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-muted">{acceptanceCopy(b, b.acceptance)}</pre>
          ) : (
            <p className="text-sm text-danger">No acceptance record.</p>
          )}
        </Card>

        <Card title="Incidents">
          {b.incidents.length === 0 && <p className="text-sm text-muted">None.</p>}
          <ul className="space-y-1 text-sm">
            {b.incidents.map((i) => (
              <li key={i.id}>
                <Link href={`/admin/incidents/${i.id}`} className="underline">
                  {fmtDateTime(i.occurredAt)} · {i.category} · {i.status}
                </Link>
              </li>
            ))}
          </ul>
          <Link href={`/admin/incidents/new?booking=${b.id}`} className="ts-btn ts-btn-ghost mt-3 text-sm">
            Report incident
          </Link>
        </Card>

        <Card title="History">
          <ul className="space-y-1 text-xs text-muted">
            {logs.map((l) => (
              <li key={l.id}>
                {fmtDateTime(l.at)} · {l.actor} · {l.action}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
