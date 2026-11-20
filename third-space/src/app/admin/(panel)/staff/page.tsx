import { db } from "@/server/db";
import { requireRole, ROLE_LABELS, ROLES } from "@/server/admin/auth";
import { saveStaffAction } from "@/server/admin/manage";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, fmtDateTime, H1, Status } from "@/components/admin/ui";

export default async function StaffPage() {
  await requireRole("staff");
  const rows = await db.staffUser.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <>
      <H1>Staff & roles</H1>
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card title="Accounts">
          <ul className="divide-y divide-line/60 text-sm" data-testid="staff-rows">
            {rows.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <strong>{u.name}</strong> · {u.email} · {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}
                  {u.lastLoginAt ? ` · last login ${fmtDateTime(u.lastLoginAt)}` : ""}
                </span>
                <Status value={u.active ? "active" : "hidden"} />
              </li>
            ))}
            {rows.length === 0 && <li className="py-2 text-muted">No staff accounts yet. You are signed in with the owner password.</li>}
          </ul>
          <dl className="mt-4 space-y-1 text-xs text-muted">
            <dt className="font-semibold">What each role can do</dt>
            <dd>Super Admin: everything, including staff and settings.</dd>
            <dd>Studio Manager: bookings, calendar, packages, add-ons, recordings, customers, content, reports.</dd>
            <dd>Booking Manager: bookings, calendar, customers, creator plans, leads, messages.</dd>
            <dd>Finance Manager: payments, refunds, coupons, reports, customers.</dd>
            <dd>Staff: today&apos;s schedule, check-in, incidents.</dd>
          </dl>
        </Card>
        <Card title="Add or update an account" testId="staff-form">
          <ActionForm action={saveStaffAction} submit="Save account">
            <Field label="Name">
              <input name="name" className="ts-input" />
            </Field>
            <Field label="Email (login)">
              <input name="email" type="email" className="ts-input" />
            </Field>
            <Field label="Role">
              <select name="role" className="ts-input">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Password (10+ characters; blank keeps the current one)">
              <input name="password" type="password" autoComplete="new-password" className="ts-input" />
            </Field>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" name="active" defaultChecked className="h-5 w-5" /> Active (untick to block login at once)
            </label>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
