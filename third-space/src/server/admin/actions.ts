"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { notifyBooking } from "@/server/notify";
import { checkPassword, endSession, requireStaff, startSession, verifyPassword, type Role } from "./auth";
import { clientKey, rateLimit } from "@/server/rate-limit";

export type ActionState = { error?: string; ok?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function loginAction(_: ActionState, f: FormData): Promise<ActionState> {
  const id = str(f, "name");
  const password = str(f, "password");
  if (id.length < 2) return { error: "Enter your email (or your name for the owner login)." };
  if (!(await rateLimit(await clientKey("login"), 10, 900))) return { error: "Too many attempts. Wait 15 minutes." };
  if (id.includes("@")) {
    const u = await db.staffUser.findUnique({ where: { email: id.toLowerCase() } });
    if (!u || !u.active || !(await verifyPassword(password, u.passwordHash))) {
      await audit(null, id.slice(0, 60), "admin.login_failed", "Admin");
      return { error: "Wrong email or password." };
    }
    await db.staffUser.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } });
    await startSession({ id: u.id, name: u.name, role: u.role as Role });
    await audit(null, u.name, "admin.login", "Admin", u.id, { role: u.role });
    redirect("/admin");
  }
  // Bootstrap owner login: shared ADMIN_PASSWORD + a name (Super Admin).
  if (!checkPassword(password)) {
    await audit(null, id.slice(0, 40), "admin.login_failed", "Admin");
    return { error: "Wrong password." };
  }
  await startSession({ id: "bootstrap", name: id.slice(0, 40), role: "super_admin" });
  await audit(null, id.slice(0, 40), "admin.login", "Admin", null, { role: "super_admin", via: "owner password" });
  redirect("/admin");
}

export async function logoutAction() {
  const who = await requireStaff();
  await audit(null, who, "admin.logout", "Admin");
  await endSession();
  redirect("/admin/login");
}

function refresh(id?: string) {
  revalidatePath("/admin", "layout");
  if (id) revalidatePath(`/admin/bookings/${id}`);
}

/** Check-in with the minimal age record from policy section 1: a count, never ID numbers or images. */
export async function checkInAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await requireStaff("checkin");
  const id = str(f, "bookingId");
  const b = await db.booking.findUnique({ where: { id } });
  if (!b) return { error: "Booking not found." };
  if (b.status !== "confirmed") return { error: `Booking is ${b.status}.` };
  const count = Number(str(f, "ageVerifiedCount"));
  if (!Number.isInteger(count) || count < 1) return { error: "Enter how many guests were verified as 18+." };
  if (f.get("idSeen") !== "on") return { error: "Confirm you saw a valid photo ID showing 18+ for each guest." };
  await db.booking.update({ where: { id }, data: { status: "checked_in", checkedInAt: new Date(), ageVerifiedCount: count, ageVerifiedBy: who } });
  await audit(null, who, "booking.checked_in", "Booking", id, { ageVerifiedCount: count, bookedGuests: b.guestCount, result: "18+ verified" });
  refresh(id);
  return { ok: count < b.guestCount ? `Checked in. Only ${count} of ${b.guestCount} guests verified: the others may not enter.` : "Checked in. 18+ verified." };
}

export async function balancePaidAction(f: FormData) {
  const who = await requireStaff("checkin");
  const id = str(f, "bookingId");
  await db.booking.update({ where: { id }, data: { balancePaidAt: new Date() } });
  await audit(null, who, "booking.balance_paid", "Booking", id, { method: str(f, "method") || "venue" });
  refresh(id);
}

export async function setStatusAction(f: FormData) {
  const who = await requireStaff("checkin");
  const id = str(f, "bookingId");
  const status = z.enum(["completed", "no_show"]).parse(str(f, "status"));
  await db.booking.update({ where: { id }, data: { status } });
  await audit(null, who, `booking.${status}`, "Booking", id);
  refresh(id);
}

export async function cancelAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await requireStaff("bookings.manage");
  const id = str(f, "bookingId");
  const b = await db.booking.findUnique({ where: { id } });
  if (!b || ["cancelled", "stopped", "refund_pending", "refunded", "completed"].includes(b.status)) return { error: "Booking cannot be cancelled." };
  const reason = str(f, "reason");
  const refund = Number(str(f, "refundAmount"));
  if (reason.length < 3) return { error: "Write a short reason." };
  if (!Number.isInteger(refund) || refund < 0 || refund > b.advancePaid) return { error: `Refund must be between 0 and ${b.advancePaid}.` };
  const status = refund > 0 ? "refund_pending" : "cancelled";
  await db.booking.update({ where: { id }, data: { status, cancelledAt: new Date(), cancelReason: reason, refundAmount: refund, holdId: null } });
  await db.hold.deleteMany({ where: { id: b.holdId ?? "" } });
  await audit(null, who, "booking.cancelled", "Booking", id, { reason, refundAmount: refund, suggested: str(f, "suggested") });
  await notifyBooking(id, "cancelled");
  refresh(id);
  return { ok: refund > 0 ? `Cancelled. Refund ₹${refund} is pending: pay it in Razorpay, then mark it refunded.` : "Cancelled." };
}

/** Stop a session for a rule breach (policy sections 7 and 8). Always opens an incident. */
export async function stopSessionAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await requireStaff("checkin");
  const id = str(f, "bookingId");
  const b = await db.booking.findUnique({ where: { id } });
  if (!b) return { error: "Booking not found." };
  const description = str(f, "description");
  if (description.length < 10) return { error: "Describe what happened (objective facts)." };
  const category = z.enum(["conduct", "prohibited_item", "content", "safety", "medical", "property", "other"]).safeParse(str(f, "category"));
  if (!category.success) return { error: "Pick a category." };
  const incident = await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id }, data: { status: "stopped" } });
    const inc = await tx.incident.create({
      data: {
        bookingId: id,
        occurredAt: new Date(),
        category: category.data,
        severity: str(f, "severity") || "medium",
        description,
        actionsTaken: "Session stopped.",
        sessionStopped: true,
        reportedBy: who,
      },
    });
    await audit(tx, who, "booking.session_stopped", "Booking", id, { incidentId: inc.id, category: category.data });
    return inc;
  });
  refresh(id);
  redirect(`/admin/incidents/${incident.id}`);
}

const IncidentForm = z.object({
  bookingId: z.string().optional(),
  occurredAt: z.string().min(1),
  category: z.enum(["conduct", "prohibited_item", "content", "safety", "medical", "property", "other"]),
  severity: z.enum(["low", "medium", "high"]),
  description: z.string().min(10).max(4000),
  witnesses: z.string().max(2000),
  actionsTaken: z.string().max(2000),
});

export async function createIncidentAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await requireStaff("incidents");
  const parsed = IncidentForm.safeParse({
    bookingId: str(f, "bookingId") || undefined,
    occurredAt: str(f, "occurredAt"),
    category: str(f, "category"),
    severity: str(f, "severity"),
    description: str(f, "description"),
    witnesses: str(f, "witnesses"),
    actionsTaken: str(f, "actionsTaken"),
  });
  if (!parsed.success) return { error: "Fill time, category, severity and a description of at least 10 characters." };
  const d = parsed.data;
  if (d.bookingId && !(await db.booking.findUnique({ where: { id: d.bookingId } }))) return { error: "No booking with that ID." };
  const occurredAt = new Date(`${d.occurredAt}:00+05:30`);
  if (Number.isNaN(occurredAt.getTime())) return { error: "Invalid time." };
  const inc = await db.incident.create({
    data: {
      ...d,
      occurredAt,
      evidencePreserved: f.get("evidencePreserved") === "on",
      authoritiesContacted: f.get("authoritiesContacted") === "on",
      reportedBy: who,
    },
  });
  await audit(null, who, "incident.created", "Incident", inc.id, { bookingId: d.bookingId, category: d.category, severity: d.severity });
  refresh();
  redirect(`/admin/incidents/${inc.id}`);
}

export async function updateIncidentAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await requireStaff("incidents");
  const id = str(f, "incidentId");
  const inc = await db.incident.findUnique({ where: { id } });
  if (!inc) return { error: "Incident not found." };
  const note = str(f, "note");
  const close = f.get("close") === "on";
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  await db.incident.update({
    where: { id },
    data: {
      actionsTaken: note ? `${inc.actionsTaken}\n[${stamp} UTC, ${who}] ${note}`.trim() : inc.actionsTaken,
      evidencePreserved: inc.evidencePreserved || f.get("evidencePreserved") === "on",
      authoritiesContacted: inc.authoritiesContacted || f.get("authoritiesContacted") === "on",
      status: close ? "closed" : inc.status,
      closedAt: close ? new Date() : inc.closedAt,
    },
  });
  await audit(null, who, close ? "incident.closed" : "incident.updated", "Incident", id, { note: note.slice(0, 200) });
  revalidatePath(`/admin/incidents/${id}`);
  return { ok: close ? "Incident closed." : "Saved." };
}

export async function createBlockAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await requireStaff("calendar");
  const resource = z.enum(["room", "studio"]).safeParse(str(f, "resource"));
  const date = str(f, "date");
  const from = str(f, "from");
  const to = str(f, "to");
  const reason = str(f, "reason");
  if (!resource.success || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to) || reason.length < 3) {
    return { error: "Fill resource, date, from, to and reason." };
  }
  const start = new Date(`${date}T${from}:00+05:30`);
  const end = new Date(`${date}T${to}:00+05:30`);
  if (end <= start) return { error: "End must be after start." };
  const clash = await db.booking.count({ where: { resource: resource.data, status: { in: ["confirmed", "checked_in"] }, start: { lt: end }, end: { gt: start } } });
  const block = await db.slotBlock.create({ data: { resource: resource.data, start, end, reason, createdBy: who } });
  await audit(null, who, "slot.blocked", "SlotBlock", block.id, { resource: resource.data, start, end, reason });
  revalidatePath("/admin/slots");
  return { ok: clash ? `Blocked. Note: ${clash} existing booking(s) overlap this time; contact those guests.` : "Blocked." };
}

export async function deleteBlockAction(f: FormData) {
  const who = await requireStaff("calendar");
  const id = str(f, "blockId");
  await db.slotBlock.delete({ where: { id } });
  await audit(null, who, "slot.unblocked", "SlotBlock", id);
  revalidatePath("/admin/slots");
}

export async function leadStatusAction(f: FormData) {
  const who = await requireStaff("leads");
  const id = str(f, "leadId");
  const status = z.enum(["new", "contacted", "closed"]).parse(str(f, "status"));
  await db.lead.update({ where: { id }, data: { status } });
  await audit(null, who, `lead.${status}`, "Lead", id);
  revalidatePath("/admin/leads");
}

export async function notificationSentAction(f: FormData) {
  const who = await requireStaff("notifications");
  const id = str(f, "notificationId");
  await db.notification.update({ where: { id }, data: { status: "sent", sentAt: new Date() } });
  await audit(null, who, "notification.sent_manually", "Notification", id);
  revalidatePath("/admin", "layout");
}

/** Add a licensed title. A licence reference is mandatory (Private Theatre addendum). */
export async function createTitleAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await requireStaff("packages");
  const name = str(f, "name");
  const runtime = Number(str(f, "runtimeMinutes"));
  const licenceRef = str(f, "licenceRef");
  if (name.length < 1 || name.length > 120) return { error: "Enter the title." };
  if (!Number.isInteger(runtime) || runtime < 10 || runtime > 420) return { error: "Runtime must be 10 to 420 minutes." };
  if (licenceRef.length < 3) return { error: "Enter the exhibition licence reference. Titles without a licence cannot be listed." };
  if (f.get("licenceConfirmed") !== "on") return { error: "Confirm the licence covers private exhibition at THIRD SPACE." };
  const title = await db.title.create({
    data: { name, runtimeMinutes: runtime, language: str(f, "language").slice(0, 40), certification: str(f, "certification").slice(0, 10), licenceRef, createdBy: who },
  });
  await audit(null, who, "title.created", "Title", title.id, { name, runtimeMinutes: runtime, licenceRef });
  revalidatePath("/admin/titles");
  return { ok: `Added ${name}.` };
}

export async function toggleTitleAction(f: FormData) {
  const who = await requireStaff("packages");
  const id = str(f, "titleId");
  const t = await db.title.findUnique({ where: { id } });
  if (!t) return;
  await db.title.update({ where: { id }, data: { active: !t.active } });
  await audit(null, who, t.active ? "title.deactivated" : "title.activated", "Title", id, { name: t.name });
  revalidatePath("/admin/titles");
}
