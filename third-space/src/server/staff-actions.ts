"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/admin/auth";
import { canOpsTransition } from "@/server/booking-state";
import { istTimeLabel, toIstIso } from "@/server/slots/time";
import type { ActionState } from "@/server/admin/actions";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const LIVE = ["confirmed", "checked_in", "in_progress"];

function refresh(id: string) {
  revalidatePath("/staff", "layout");
  revalidatePath(`/admin/bookings/${id}`);
}

/** Staff marks the room prepared (cleaned, set up, equipment checked) before the guests arrive. */
export async function roomReadyAction(f: FormData) {
  const me = await requireRole("checkin");
  const id = str(f, "bookingId");
  const b = await db.booking.findUnique({ where: { id } });
  if (!b || !["confirmed", "checked_in"].includes(b.status) || b.roomReadyAt) return;
  await db.booking.update({ where: { id }, data: { roomReadyAt: new Date(), roomReadyBy: me.name } });
  await audit(null, me.name, "booking.room_ready", "Booking", id);
  refresh(id);
}

/** Start or complete a session, or record a no-show, only along the allowed line (see booking-state). */
export async function staffProgressAction(f: FormData) {
  const me = await requireRole("checkin");
  const id = str(f, "bookingId");
  const to = z.enum(["in_progress", "completed", "no_show"]).parse(str(f, "status"));
  const b = await db.booking.findUnique({ where: { id } });
  if (!b || !canOpsTransition(b.status, to, { start: b.start })) {
    await audit(null, me.name, "booking.transition_refused", "Booking", id, { from: b?.status, to });
    return;
  }
  await db.booking.update({ where: { id }, data: { status: to } });
  await audit(null, me.name, `booking.${to}`, "Booking", id);
  refresh(id);
}

/** Append an operational note ("projector lamp flickers", "guest asked for extra chairs"). Notes are never overwritten. */
export async function staffNoteAction(_: ActionState, f: FormData): Promise<ActionState> {
  const me = await requireRole("checkin");
  const id = str(f, "bookingId");
  const note = str(f, "note");
  if (note.length < 3 || note.length > 500) return { error: "Write 3 to 500 characters." };
  const b = await db.booking.findUnique({ where: { id } });
  if (!b) return { error: "Booking not found." };
  const stamp = istTimeLabel(toIstIso(new Date()));
  const line = `[${stamp}] ${me.name}: ${note}`;
  await db.booking.update({ where: { id }, data: { staffNotes: b.staffNotes ? `${b.staffNotes}\n${line}` : line } });
  await audit(null, me.name, "booking.staff_note", "Booking", id);
  refresh(id);
  return { ok: "Note added." };
}

/** Report a problem during a booking without stopping the session (use "Stop session" in admin for that). */
export async function staffIssueAction(_: ActionState, f: FormData): Promise<ActionState> {
  const me = await requireRole("incidents");
  const id = str(f, "bookingId");
  const category = z.enum(["conduct", "prohibited_item", "content", "safety", "medical", "property", "other"]).safeParse(str(f, "category"));
  const severity = z.enum(["low", "medium", "high"]).safeParse(str(f, "severity") || "medium");
  const description = str(f, "description");
  if (!category.success || !severity.success) return { error: "Pick a category and severity." };
  if (description.length < 10 || description.length > 2000) return { error: "Describe what happened in 10 to 2000 characters (facts only)." };
  const b = await db.booking.findUnique({ where: { id } });
  if (!b) return { error: "Booking not found." };
  const inc = await db.incident.create({ data: { bookingId: id, occurredAt: new Date(), category: category.data, severity: severity.data, description, reportedBy: me.name } });
  await audit(null, me.name, "incident.reported_by_staff", "Incident", inc.id, { bookingId: id, category: category.data, severity: severity.data });
  refresh(id);
  return { ok: "Issue reported to the manager." };
}

/** Manager assigns (or clears) the staff member who runs a booking. */
export async function assignStaffAction(_: ActionState, f: FormData): Promise<ActionState> {
  const me = await requireRole("bookings.manage");
  const id = str(f, "bookingId");
  const staffId = str(f, "staffId");
  const b = await db.booking.findUnique({ where: { id } });
  if (!b || !LIVE.includes(b.status)) return { error: "Only live bookings can be assigned." };
  if (staffId) {
    const u = await db.staffUser.findUnique({ where: { id: staffId } });
    if (!u || !u.active) return { error: "That staff member is not active." };
  }
  await db.booking.update({ where: { id }, data: { assignedStaffId: staffId || null } });
  await audit(null, me.name, "booking.assigned", "Booking", id, { staffId: staffId || null });
  refresh(id);
  return { ok: staffId ? "Assigned." : "Unassigned." };
}
