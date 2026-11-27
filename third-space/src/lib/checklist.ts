/** Daily ops checklist (the staff dashboard's "Daily report and checklist"). Stored per day in the Setting table (no extra table). */
export const CHECKLIST_ITEMS = [
  { id: "projector_audio", label: "Projector and audio test" },
  { id: "mic_camera", label: "Mic and camera test" },
  { id: "sanitization", label: "Room sanitisation" },
  { id: "recordings", label: "Recordings backed up and delivered" },
  { id: "closing", label: "Closing check" },
] as const;

export type ChecklistItemId = (typeof CHECKLIST_ITEMS)[number]["id"];
export type ChecklistState = { items: Partial<Record<ChecklistItemId, { by: string; at: string }>>; note: string };

export const checklistKey = (date: string) => `checklist:${date}`;
export const isChecklistItem = (id: string): id is ChecklistItemId => CHECKLIST_ITEMS.some((i) => i.id === id);
export const emptyChecklist = (): ChecklistState => ({ items: {}, note: "" });

/** Reads a stored value defensively: anything unexpected becomes an empty checklist. */
export function parseChecklist(v: unknown): ChecklistState {
  const out = emptyChecklist();
  if (!v || typeof v !== "object") return out;
  const o = v as { items?: Record<string, { by?: unknown; at?: unknown }>; note?: unknown };
  for (const i of CHECKLIST_ITEMS) {
    const e = o.items?.[i.id];
    if (e && typeof e.by === "string" && typeof e.at === "string") out.items[i.id] = { by: e.by, at: e.at };
  }
  if (typeof o.note === "string") out.note = o.note.slice(0, 500);
  return out;
}

export const doneCount = (s: ChecklistState) => CHECKLIST_ITEMS.filter((i) => s.items[i.id]).length;
export const dayClosed = (s: ChecklistState) => doneCount(s) === CHECKLIST_ITEMS.length;
