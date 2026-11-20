"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { notifyBooking } from "@/server/notify";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { refundFor } from "@/lib/pricing";
import { ensureCatalog } from "@/server/catalog";
import { guestRescheduleBlock, moveBooking } from "@/server/reschedule";

export type GuestState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Find a booking with ID + phone + email (all three must match). Rate-limited. */
export async function findBookingAction(_: GuestState, f: FormData): Promise<GuestState> {
  if (!(await rateLimit(await clientKey("lookup"), 10, 900))) return { error: "Too many attempts. Try again in 15 minutes." };
  const id = str(f, "bookingId").toUpperCase();
  const phone = str(f, "phone").replace(/\D/g, "").slice(-10);
  const email = str(f, "email").toLowerCase();
  const b = await db.booking.findUnique({ where: { id } });
  if (!b || b.guestPhone !== phone || b.guestEmail.toLowerCase() !== email) {
    return { error: "We could not find a booking with those details.", values: { bookingId: id, phone, email } };
  }
  redirect(`/my-booking/${b.id}?t=${b.accessToken}`);
}

/** Guest cancels their own booking; refund follows the tiers on what was paid online. */
export async function guestCancelAction(_: GuestState, f: FormData): Promise<GuestState> {
  await ensureCatalog();
  const id = str(f, "bookingId");
  const token = str(f, "token");
  const b = await db.booking.findUnique({ where: { id } });
  if (!b || b.accessToken !== token) return { error: "Not allowed." };
  if (!["confirmed", "pending_payment"].includes(b.status) || b.start <= new Date()) return { error: "This booking can no longer be cancelled online. Message us on WhatsApp." };
  if (f.get("confirm") !== "on") return { error: "Tick the box to confirm." };
  const hoursBefore = (b.start.getTime() - Date.now()) / 3600_000;
  const refund = refundFor(b.advancePaid, hoursBefore);
  await db.$transaction([
    db.booking.update({ where: { id }, data: { status: refund > 0 ? "refund_pending" : "cancelled", cancelledAt: new Date(), cancelReason: "Cancelled by guest online", refundAmount: refund, holdId: null } }),
    db.hold.deleteMany({ where: { id: b.holdId ?? "" } }),
  ]);
  await audit(null, "guest", "booking.cancelled_by_guest", "Booking", id, { hoursBefore: Math.round(hoursBefore), refund });
  await notifyBooking(id, "cancelled");
  redirect(`/my-booking/${id}?t=${token}&cancelled=${refund}`);
}

/**
 * Guest moves their own booking to another free slot (same package and length).
 * Rules (on/off, notice, times) come from Admin → Settings; the engine prevents double booking.
 */
export async function guestRescheduleAction(_: GuestState, f: FormData): Promise<GuestState> {
  await ensureCatalog();
  if (!(await rateLimit(await clientKey("reschedule"), 10, 900))) return { error: "Too many attempts. Try again in 15 minutes." };
  const id = str(f, "bookingId");
  const token = str(f, "token");
  const start = str(f, "start");
  const b = await db.booking.findUnique({ where: { id } });
  if (!b || b.accessToken !== token) return { error: "Not allowed." };
  const block = guestRescheduleBlock(b);
  if (block) return { error: block };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(start) || Number.isNaN(Date.parse(start))) return { error: "Pick a new time." };
  if (Date.parse(start) === b.start.getTime()) return { error: "That is the current time. Pick a different slot." };
  const moved = await moveBooking(id, start);
  if (!moved.ok) return { error: moved.error };
  await audit(null, "guest", "booking.rescheduled_by_guest", "Booking", id, { from: b.start, to: moved.start });
  await notifyBooking(id, "rescheduled");
  redirect(`/my-booking/${id}?t=${token}&moved=1`);
}
