import { db } from "@/server/db";
import { requireRole } from "@/server/admin/auth";
import { saveAddOnAction } from "@/server/admin/manage";
import { formatINR } from "@/lib/pricing";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, H1, Status } from "@/components/admin/ui";

const MODES = [
  ["watch", "Theatre"],
  ["celebrate", "Celebrations"],
  ["create", "Studio"],
] as const;

function AddOnForm({ a }: { a?: { id: string; nameEn: string; nameHi: string; price: number; modes: string[]; active: boolean; sortOrder: number } }) {
  return (
    <ActionForm action={saveAddOnAction} submit={a ? "Save" : "Add"} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_100px_auto] sm:items-end">
      <Field label="ID">
        <input name="id" defaultValue={a?.id ?? ""} readOnly={!!a} className="ts-input" />
      </Field>
      <Field label="Name (English)">
        <input name="nameEn" defaultValue={a?.nameEn ?? ""} className="ts-input" />
      </Field>
      <Field label="Name (Hinglish)">
        <input name="nameHi" defaultValue={a?.nameHi ?? ""} className="ts-input" />
      </Field>
      <Field label="Price ₹">
        <input name="price" type="number" min={0} defaultValue={a?.price ?? ""} className="ts-input" />
      </Field>
      <input type="hidden" name="sortOrder" value={a?.sortOrder ?? 50} />
      <div className="flex flex-wrap gap-3 text-sm sm:col-span-5">
        {MODES.map(([m, label]) => (
          <label key={m} className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name={`mode_${m}`} defaultChecked={a ? a.modes.includes(m) : false} className="h-5 w-5" /> {label}
          </label>
        ))}
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={a?.active ?? true} className="h-5 w-5" /> Active
        </label>
      </div>
    </ActionForm>
  );
}

export default async function AddOnsPage() {
  await requireRole("packages");
  const rows = await db.addOn.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <H1>Add-ons</H1>
      <div className="space-y-4">
        {rows.map((a) => (
          <Card key={a.id} title={`${a.nameEn} · ${formatINR(a.price)}`}>
            <div className="mb-2">
              <Status value={a.active ? "active" : "hidden"} />
            </div>
            <AddOnForm a={a} />
          </Card>
        ))}
        <Card title="New add-on" testId="addon-new">
          <AddOnForm />
        </Card>
      </div>
    </>
  );
}
