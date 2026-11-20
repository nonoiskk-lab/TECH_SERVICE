import Link from "next/link";
import { notFound } from "next/navigation";
import { addOns, themes } from "@/config/site";
import { getPackage } from "@/config/packages";
import { db } from "@/server/db";
import { acceptanceCopy } from "@/lib/acceptance-copy";
import { formatINR, refundFor } from "@/lib/pricing";
import { durationText } from "@/lib/session";
import { balancePaidAction, cancelAction, checkInAction, setStatusAction, stopSessionAction } from "@/server/admin/actions";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, fmtDateTime, fmtTime, H1, hoursUntil, Status } from "@/components/admin/ui";
import { can, requireRole } from "@/server/admin/auth";
import { attachRecordingAction, manualConfirmAction, markRefundedAction, recordPaymentAction, rescheduleAction, setProgressAction } from "@/server/admin/manage";
import { toIstIso } from "@/server/slots/time";

export default async function BookingDetail({ params }: PageProps<"/admin/bookings/[id]">) {
  const me = await requireRole("bookings.view");
  const { id } = await params;
  const b = await db.booking.findUnique({
    where: { id },
    include: { acceptance: true, incidents: { orderBy: { createdAt: "desc" } }, notifications: true, payments: { orderBy: { createdAt: "asc" } }, recordings: true },
  });
  if (!b) notFound();
  const pkg = getPackage(b.packageId);
  const hoursBefore = hoursUntil(b.start);
  const suggestedRefund = refundFor(b.advancePaid, Math.max(0, hoursBefore));
  const active = ["confirmed", "checked_in", "in_progress", "pending_payment"].includes(b.status);
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
            <dt className="text-muted">Session</dt>
            <dd data-testid="session-detail">
              {b.titleName ? `${b.titleName} · ` : ""}
              {durationText(b.durationMinutes || (b.end.getTime() - b.start.getTime()) / 60_000)}
              {b.sessionInput ? <span className="text-faint"> ({Object.entries(b.sessionInput as Record<string, unknown>).filter(([k]) => k !== "titleId").map(([k, v]) => `${k} ${v}`).join(", ")})</span> : null}
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

        {b.specialRequests && (
          <Card title="Special instructions">
            <p className="whitespace-pre-wrap text-sm">{b.specialRequests}</p>
          </Card>
        )}

        <Card title="Payments" testId="payments">
          <ul className="space-y-1 text-sm">
            {b.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 border-b border-line/50 pb-1">
                <span>
                  {p.kind} · {p.provider} {p.orderId ? `· ${p.orderId}` : ""} {p.note ? `· ${p.note}` : ""}
                </span>
                <span className="flex items-center gap-2">
                  {formatINR(p.amount)} <Status value={p.status} />
                </span>
              </li>
            ))}
            {b.payments.length === 0 && <li className="text-muted">None.</li>}
          </ul>
          <p className="mt-2 text-sm">
            Total {formatINR(b.total)}
            {b.discount > 0 ? ` (discount ${formatINR(b.discount)}${b.couponCode ? `, ${b.couponCode}` : ""})` : ""} · received {formatINR(b.advancePaid)} · due{" "}
            {formatINR(b.balanceDue)}
          </p>
          {b.balanceDue > 0 && ["confirmed", "checked_in", "in_progress"].includes(b.status) && can(me.role, "checkin") && (
            <ActionForm action={recordPaymentAction} submit="Record payment" className="mt-3 flex flex-wrap items-end gap-2" testId="record-payment">
              <input type="hidden" name="bookingId" value={b.id} />
              <Field label="Amount (₹)">
                <input name="amount" type="number" min={1} max={b.balanceDue} defaultValue={b.balanceDue} className="ts-input w-32" />
              </Field>
              <Field label="Method">
                <select name="method" className="ts-input w-28">
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank</option>
                </select>
              </Field>
            </ActionForm>
          )}
          {b.status === "pending_payment" && can(me.role, "bookings.manage") && (
            <ActionForm action={manualConfirmAction} submit="Confirm manually" className="mt-3 space-y-2" testId="manual-confirm">
              <input type="hidden" name="bookingId" value={b.id} />
              <p className="text-sm text-muted">Use only when the guest paid outside Razorpay (UPI to the business account, cash). Online payments confirm automatically.</p>
              <div className="flex flex-wrap gap-2">
                <Field label="Amount received (₹)">
                  <input name="amount" type="number" min={0} defaultValue={0} className="ts-input w-32" />
                </Field>
                <Field label="Method">
                  <select name="method" className="ts-input w-28">
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                  </select>
                </Field>
                <Field label="Reference">
                  <input name="note" className="ts-input w-40" />
                </Field>
              </div>
            </ActionForm>
          )}
          {b.status === "refund_pending" && can(me.role, "payments") && (
            <ActionForm action={markRefundedAction} submit="Mark refund paid" className="mt-3 flex flex-wrap items-end gap-2" testId="mark-refunded">
              <input type="hidden" name="bookingId" value={b.id} />
              <p className="w-full text-sm text-danger">Refund due: {formatINR(b.refundAmount ?? b.advancePaid)}. Pay it in Razorpay (or by bank), then record the reference.</p>
              <Field label="Refund reference">
                <input name="reference" className="ts-input w-56" />
              </Field>
            </ActionForm>
          )}
        </Card>

        {["confirmed", "pending_payment"].includes(b.status) && can(me.role, "bookings.manage") && (
          <Card title="Reschedule" testId="reschedule">
            <ActionForm action={rescheduleAction} submit="Move booking" className="space-y-2">
              <input type="hidden" name="bookingId" value={b.id} />
              <p className="text-sm text-muted">Same length ({Math.round((b.end.getTime() - b.start.getTime()) / 60000)} min). The engine checks hours, buffers and closures.</p>
              <div className="flex flex-wrap gap-2">
                <Field label="New date">
                  <input name="date" type="date" defaultValue={toIstIso(b.start).slice(0, 10)} className="ts-input" />
                </Field>
                <Field label="New start">
                  <input name="time" type="time" step={1800} defaultValue={toIstIso(b.start).slice(11, 16)} className="ts-input" />
                </Field>
              </div>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" name="notify" defaultChecked className="h-5 w-5" /> Tell the guest
              </label>
            </ActionForm>
          </Card>
        )}

        {["checked_in", "in_progress"].includes(b.status) && can(me.role, "checkin") && (
          <Card title="Session">
            <div className="flex flex-wrap gap-2">
              {b.status === "checked_in" && (
                <form action={setProgressAction}>
                  <input type="hidden" name="bookingId" value={b.id} />
                  <input type="hidden" name="status" value="in_progress" />
                  <button className="ts-btn ts-btn-primary text-sm" data-testid="start-session">
                    Start session
                  </button>
                </form>
              )}
              <form action={setProgressAction}>
                <input type="hidden" name="bookingId" value={b.id} />
                <input type="hidden" name="status" value="completed" />
                <button className="ts-btn ts-btn-ghost text-sm">Mark completed</button>
              </form>
            </div>
          </Card>
        )}

        {b.resource === "studio" && can(me.role, "recordings") && (
          <Card title="Recording delivery" testId="recordings">
            <ul className="mb-3 space-y-1 text-sm">
              {b.recordings.map((r) => (
                <li key={r.id}>
                  {r.label} · link valid until {fmtDateTime(r.expiresAt)} · {r.downloads} download(s){r.deliveredAt ? " · sent" : ""}
                </li>
              ))}
              {b.recordings.length === 0 && <li className="text-muted">No files yet.</li>}
            </ul>
            <ActionForm action={attachRecordingAction} submit="Attach file" className="space-y-2">
              <input type="hidden" name="bookingId" value={b.id} />
              <Field label="File link (https, private storage)">
                <input name="url" className="ts-input" placeholder="https://" />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Field label="Label">
                  <input name="label" defaultValue="Raw audio + video" className="ts-input w-48" />
                </Field>
                <Field label="Link expires (days)">
                  <input name="expiryDays" type="number" min={1} max={30} defaultValue={7} className="ts-input w-24" />
                </Field>
                <Field label="Delete record after (days)">
                  <input name="deleteAfterDays" type="number" min={1} max={365} defaultValue={30} className="ts-input w-24" />
                </Field>
              </div>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" name="notify" defaultChecked className="h-5 w-5" /> Send the private link to the guest
              </label>
              <p className="text-xs text-faint">The guest gets a THIRD SPACE link that only works for this booking until it expires; the storage link stays hidden.</p>
            </ActionForm>
          </Card>
        )}

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
