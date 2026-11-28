import { db } from "@/server/db";
import { formatINR } from "@/lib/pricing";
import { requireRole } from "@/server/admin/auth";
import { saveCouponAction } from "@/server/admin/manage";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, fmtDateTime, H1, Status } from "@/components/admin/ui";

export default async function CouponsPage() {
  await requireRole("coupons");
  const rows = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <H1>Coupons & offers</H1>
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card title="Coupons">
          <ul className="divide-y divide-line/60 text-sm" data-testid="coupon-rows">
            {rows.map((c) => (
              <li key={c.code} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <strong>{c.code}</strong> · {c.kind === "percent" ? `${c.value}% off` : `${formatINR(c.value)} off`}
                  {c.minSubtotal ? ` · min ${formatINR(c.minSubtotal)}` : ""} · used {c.usedCount}
                  {c.maxUses ? `/${c.maxUses}` : ""}
                  {c.packageIds.length ? ` · only ${c.packageIds.join(", ")}` : ""}
                  {c.validUntil ? ` · until ${fmtDateTime(c.validUntil)}` : ""}
                </span>
                <Status value={c.active ? "active" : "hidden"} />
              </li>
            ))}
            {rows.length === 0 && <li className="py-2 text-muted">No coupons.</li>}
          </ul>
        </Card>
        <Card title="Create or update a coupon" testId="coupon-form">
          <ActionForm action={saveCouponAction} submit="Save coupon">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Code">
                <input name="code" className="ts-input uppercase" />
              </Field>
              <Field label="Type">
                <select name="kind" className="ts-input">
                  <option value="percent">Percent</option>
                  <option value="flat">Flat ₹ (rupees)</option>
                </select>
              </Field>
              <Field label="Value (percent, or rupees for flat)">
                <input name="value" type="number" step="0.01" min={0.01} className="ts-input" />
              </Field>
              <Field label="Min subtotal ₹">
                <input name="minSubtotal" type="number" step="0.01" min={0} defaultValue={0} className="ts-input" />
              </Field>
              <Field label="Max uses (blank = unlimited)">
                <input name="maxUses" type="number" min={1} className="ts-input" />
              </Field>
              <Field label="Only packages (ids, comma)">
                <input name="packageIds" className="ts-input" />
              </Field>
              <Field label="Valid from">
                <input name="validFrom" type="date" className="ts-input" />
              </Field>
              <Field label="Valid until">
                <input name="validUntil" type="date" className="ts-input" />
              </Field>
            </div>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" name="active" defaultChecked className="h-5 w-5" /> Active
            </label>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
