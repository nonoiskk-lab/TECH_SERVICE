import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireRole } from "@/server/admin/auth";
import { savePackageAction } from "@/server/admin/manage";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, H1 } from "@/components/admin/ui";

type Inc = { en: string; hi: string };

export default async function PackageEdit({ params }: PageProps<"/admin/packages/[id]">) {
  await requireRole("packages");
  const { id } = await params;
  const p = id === "new" ? null : await db.package.findUnique({ where: { id } });
  if (id !== "new" && !p) notFound();
  const inc = ((p?.inclusions as Inc[] | null) ?? []).map((i) => (i.hi && i.hi !== i.en ? `${i.en} | ${i.hi}` : i.en)).join("\n");
  const n = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  return (
    <>
      <H1>{p ? `Edit: ${p.nameEn}` : "New package"}</H1>
      <Card testId="package-form">
        <ActionForm action={savePackageAction} submit="Save package">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ID (a-z, 0-9, -; cannot change later)">
              <input name="id" defaultValue={p?.id ?? ""} readOnly={!!p} className="ts-input" />
            </Field>
            <Field label="Space">
              <select name="resourceId" defaultValue={p?.resourceId ?? "studio"} className="ts-input">
                <option value="room">Private Theatre</option>
                <option value="studio">Podcast & Creator Studio</option>
              </select>
            </Field>
            <Field label="Experience">
              <select name="category" defaultValue={p?.category ?? "podcast"} className="ts-input">
                <option value="theatre">Private Theatre</option>
                <option value="celebration">Celebration</option>
                <option value="podcast">Podcast / content</option>
                <option value="creator">Creator plan</option>
                <option value="visit">Free visit</option>
              </select>
            </Field>
            <Field label="How time and price are set">
              <select name="pricingKind" defaultValue={p?.pricingKind ?? "fixed"} className="ts-input">
                <option value="fixed">Fixed price and duration</option>
                <option value="title">By film runtime (theatre)</option>
                <option value="podcast">By episodes (podcast)</option>
                <option value="creator">By reels and videos (shoot)</option>
                <option value="hourly">By the hour</option>
              </select>
            </Field>
            <Field label="Name (English)">
              <input name="nameEn" defaultValue={p?.nameEn ?? ""} className="ts-input" />
            </Field>
            <Field label="Name (Hinglish)">
              <input name="nameHi" defaultValue={p?.nameHi ?? ""} className="ts-input" />
            </Field>
            <Field label="Starting price (₹, before tax)">
              <input name="startingPrice" type="number" min={0} defaultValue={n(p?.startingPrice)} className="ts-input" />
            </Field>
            <Field label="Rate per hour (₹) for longer sessions">
              <input name="ratePerHour" type="number" min={0} defaultValue={n(p?.ratePerHour)} className="ts-input" />
            </Field>
            <Field label="Base duration (min)">
              <input name="durationMinutes" type="number" min={10} defaultValue={n(p?.durationMinutes ?? 120)} className="ts-input" />
            </Field>
            <Field label="Setup added (min)">
              <input name="setupMinutes" type="number" min={0} defaultValue={n(p?.setupMinutes ?? 30)} className="ts-input" />
            </Field>
            <Field label="Max guests">
              <input name="maxGuests" type="number" min={1} defaultValue={n(p?.maxGuests ?? 4)} className="ts-input" />
            </Field>
            <Field label="Advance % (blank = business default)">
              <input name="advancePercent" type="number" min={0} max={100} defaultValue={n(p?.advancePercent)} className="ts-input" />
            </Field>
            <Field label="Plan hours (creator plans only)">
              <input name="planHours" type="number" min={1} defaultValue={n(p?.planHours)} className="ts-input" />
            </Field>
            <Field label="Plan validity (days)">
              <input name="planValidityDays" type="number" min={1} defaultValue={n(p?.planValidityDays)} className="ts-input" />
            </Field>
            <Field label="Sort order">
              <input name="sortOrder" type="number" defaultValue={n(p?.sortOrder ?? 50)} className="ts-input" />
            </Field>
          </div>
          <Field label="Short description (English)">
            <textarea name="summaryEn" defaultValue={p?.summaryEn ?? ""} className="ts-input min-h-16" />
          </Field>
          <Field label="Short description (Hinglish)">
            <textarea name="summaryHi" defaultValue={p?.summaryHi ?? ""} className="ts-input min-h-16" />
          </Field>
          <Field label="What's included: one per line, optional Hinglish after | (only what you actually provide)">
            <textarea name="inclusions" defaultValue={inc} className="ts-input min-h-24" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Price list label (English)">
              <input name="priceListLabelEn" defaultValue={p?.priceListLabelEn ?? ""} className="ts-input" />
            </Field>
            <Field label="Price list label (Hinglish)">
              <input name="priceListLabelHi" defaultValue={p?.priceListLabelHi ?? ""} className="ts-input" />
            </Field>
            <Field label="Price list note (English)">
              <input name="priceListNoteEn" defaultValue={p?.priceListNoteEn ?? ""} className="ts-input" />
            </Field>
            <Field label="Price list note (Hinglish)">
              <input name="priceListNoteHi" defaultValue={p?.priceListNoteHi ?? ""} className="ts-input" />
            </Field>
          </div>
          {(
            [
              ["active", "Active (bookable)", p?.active ?? true],
              ["showInPriceList", "Show in the public price list", p?.showInPriceList ?? true],
              ["pricePlus", 'Show "+" after the price (extras quoted)', p?.pricePlus ?? false],
              ["requiresLegalGate", "Plays films: hidden until the film licence gate is open", p?.requiresLegalGate ?? false],
            ] as const
          ).map(([name, label, on]) => (
            <label key={name} className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" name={name} defaultChecked={on} className="h-5 w-5" /> {label}
            </label>
          ))}
        </ActionForm>
      </Card>
    </>
  );
}
