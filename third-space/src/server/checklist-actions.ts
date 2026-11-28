"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/admin/auth";
import { istToday, toIstIso } from "@/server/slots/time";
import { checklistKey, isChecklistItem, parseChecklist, type ChecklistState } from "@/lib/checklist";
import type { ActionState } from "@/server/admin/actions";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Read, change and write one day's checklist under a per-day advisory lock, so two people ticking different items cannot overwrite each other. */
async function update(date: string, who: string, change: (s: ChecklistState) => void) {
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"checklist:" + date}))`;
    const row = await tx.setting.findUnique({ where: { key: checklistKey(date) } });
    const state = parseChecklist(row?.value);
    change(state);
    await tx.setting.upsert({
      where: { key: checklistKey(date) },
      create: { key: checklistKey(date), value: state, updatedBy: who },
      update: { value: state, updatedBy: who },
    });
  });
}

/** Tick or untick one item for TODAY. Past days are read-only, so a closed day cannot be rewritten later. */
export async function toggleChecklistAction(f: FormData) {
  const me = await requireRole("checkin");
  const date = str(f, "date");
  const item = str(f, "item");
  if (date !== istToday() || !isChecklistItem(item)) return;
  let nowDone = false;
  await update(date, me.name, (s) => {
    if (s.items[item]) delete s.items[item];
    else {
      s.items[item] = { by: me.name, at: toIstIso(new Date()) };
      nowDone = true;
    }
  });
  await audit(null, me.name, nowDone ? "checklist.done" : "checklist.undone", "Checklist", date, { item });
  revalidatePath("/staff/checklist");
}

export async function checklistNoteAction(_: ActionState, f: FormData): Promise<ActionState> {
  const me = await requireRole("checkin");
  const date = str(f, "date");
  const note = str(f, "note");
  if (date !== istToday()) return { error: "Only today's report can be edited." };
  if (note.length > 500) return { error: "Keep the note under 500 characters." };
  await update(date, me.name, (s) => {
    s.note = note;
  });
  await audit(null, me.name, "checklist.note", "Checklist", date);
  revalidatePath("/staff/checklist");
  return { ok: "Saved." };
}
