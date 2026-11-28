import { db } from "@/server/db";
import { paiseToInput } from "@/lib/money";
import { isLegalGateOpen } from "@/config/site";
import { requireRole } from "@/server/admin/auth";
import { saveBusinessSettingsAction } from "@/server/admin/manage";
import type { BusinessRules } from "@/server/catalog";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, H1 } from "@/components/admin/ui";

export default async function SettingsPage() {
  await requireRole("settings");
  const row = await db.setting.findUnique({ where: { key: "business" } });
  const b = (row?.value ?? {}) as Partial<BusinessRules>;
  const tiers = b.refundTiers ?? [
    { minHoursBefore: 72, refundPercentOfAdvance: 90 },
    { minHoursBefore: 24, refundPercentOfAdvance: 50 },
    { minHoursBefore: 0, refundPercentOfAdvance: 0 },
  ];
  return (
    <>
      <H1>Business settings</H1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Money and holds" testId="business-settings">
          <ActionForm action={saveBusinessSettingsAction} submit="Save settings">
            <div className="grid grid-cols-2 gap-2">
              <Field label="GST %">
                <input name="taxPercent" type="number" min={0} max={28} defaultValue={b.taxPercent ?? 18} className="ts-input" />
              </Field>
              <Field label="Advance % (when Razorpay is live)">
                <input name="advancePercent" type="number" min={0} max={100} defaultValue={b.advancePercent ?? 50} className="ts-input" />
              </Field>
              <Field label="Checkout hold (minutes)">
                <input name="holdMinutes" type="number" min={5} max={60} defaultValue={b.holdMinutes ?? 15} className="ts-input" />
              </Field>
              <Field label="Minimum booking price ₹">
                <input name="minimumCharge" type="number" step="0.01" min={0} defaultValue={paiseToInput(b.minimumCharge ?? 79900)} className="ts-input" />
              </Field>
            </div>
            <p className="mt-2 text-sm font-semibold">Guest self-service rescheduling</p>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" name="selfReschedule" defaultChecked={b.selfReschedule ?? true} className="h-5 w-5" /> Guests can move their own booking online
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Field label="At least … hours before start">
                <input name="rescheduleMinHours" type="number" min={0} max={720} defaultValue={b.rescheduleMinHours ?? 24} className="ts-input" />
              </Field>
              <Field label="Times per booking">
                <input name="rescheduleMaxTimes" type="number" min={0} max={10} defaultValue={b.rescheduleMaxTimes ?? 1} className="ts-input" />
              </Field>
            </div>
            <p className="mt-2 text-sm font-semibold">Refund tiers (share of the advance)</p>
            {tiers.map((t, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <Field label={`Cancelled at least … hours before`}>
                  <input name={`tierHours${i}`} type="number" min={0} defaultValue={t.minHoursBefore} className="ts-input" />
                </Field>
                <Field label="Refund %">
                  <input name={`tierPct${i}`} type="number" min={0} max={100} defaultValue={t.refundPercentOfAdvance} className="ts-input" />
                </Field>
              </div>
            ))}
          </ActionForm>
        </Card>
        <Card title="Set on the server (environment)">
          <ul className="space-y-1 text-sm">
            <li>Film licence gate: {isLegalGateOpen() ? "open" : "closed"} (THIRD_SPACE_LEGAL_GATE)</li>
            <li>Razorpay: {process.env.RAZORPAY_KEY_ID ? "keys set" : "not set → pay at venue"}</li>
            <li>WhatsApp: {process.env.WHATSAPP_TOKEN ? "token set" : "not set"}</li>
            <li>Email: {process.env.RESEND_API_KEY ? "key set" : "not set"}</li>
            <li>Policy status: {process.env.POLICY_STATUS === "final" ? "final" : "draft"}</li>
          </ul>
          <p className="mt-2 text-xs text-faint">These are changed in Vercel → Project → Settings → Environment Variables, then redeploy. Secrets never appear here.</p>
        </Card>
      </div>
    </>
  );
}
