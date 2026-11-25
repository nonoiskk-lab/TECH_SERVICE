import { packages } from "@/config/packages";
import { requireRole } from "@/server/admin/auth";
import { manualBookingAction } from "@/server/admin/manage";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, H1 } from "@/components/admin/ui";
import { istToday } from "@/server/slots/time";
import { db } from "@/server/db";
import { balancesFor } from "@/server/credits";

export default async function NewBookingPage() {
  await requireRole("bookings.manage");
  const plans = await db.creatorMembership.findMany({ where: { status: "active", validUntil: { gt: new Date() } }, include: { customer: true }, orderBy: { createdAt: "desc" }, take: 100 });
  const bal = await balancesFor(plans.map((m) => m.id));
  const usable = plans.filter((m) => (bal.get(m.id) ?? 0) > 0);
  return (
    <>
      <H1>New booking (staff)</H1>
      <Card>
        <p className="mb-4 text-sm text-muted">
          For phone or walk-in bookings. The slot engine checks hours, buffers, closures and shared equipment exactly as for online bookings. The guest pays at the
          venue; record the payment on the booking page. Variable sessions (movie, podcast, shoot) are charged at the package rate for the minutes you enter,
          never below the starting price.
        </p>
        <ActionForm action={manualBookingAction} submit="Create booking" testId="manual-booking">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Package">
              <select name="packageId" className="ts-input">
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name.en}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Total minutes (incl. setup)">
              <input name="durationMinutes" type="number" min={10} max={480} step={5} defaultValue={120} className="ts-input" />
            </Field>
            <Field label="Date">
              <input name="date" type="date" defaultValue={istToday()} className="ts-input" />
            </Field>
            <Field label="Start time">
              <input name="time" type="time" step={1800} defaultValue="18:00" className="ts-input" />
            </Field>
            <Field label="Guest name">
              <input name="name" className="ts-input" />
            </Field>
            <Field label="Mobile number">
              <input name="phone" inputMode="numeric" maxLength={10} className="ts-input" />
            </Field>
            <Field label="Email (optional)">
              <input name="email" type="email" className="ts-input" />
            </Field>
            <Field label="Guests">
              <input name="guestCount" type="number" min={1} max={20} defaultValue={2} className="ts-input" />
            </Field>
          </div>
          {usable.length > 0 && (
            <Field label="Pay with Creator Plan hours (optional)">
              <select name="membershipId" className="ts-input" defaultValue="" data-testid="plan-select">
                <option value="">No: guest pays at the venue</option>
                {usable.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.customer.name} · {m.customer.phone} · {Math.floor((bal.get(m.id) ?? 0) / 60)}h {(bal.get(m.id) ?? 0) % 60}m left
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-faint">Use the same mobile number as the plan holder. The minutes are taken from the plan in the same step as the booking.</span>
            </Field>
          )}
          <Field label="Notes">
            <textarea name="notes" className="ts-input min-h-16" />
          </Field>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" name="notify" defaultChecked className="h-5 w-5" /> Send the confirmation to the guest
          </label>
          <p className="text-xs text-faint">The guest still accepts the 18+ declaration in person at check-in; the record shows this booking was made by staff.</p>
        </ActionForm>
      </Card>
    </>
  );
}
