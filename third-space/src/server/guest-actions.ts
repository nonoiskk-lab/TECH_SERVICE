"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { notifyBooking } from "@/server/notify";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { refundFor } from "@/lib/pricing";
import { ensureCatalog } from "@/server/catalog";

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
