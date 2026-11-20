import "server-only";
import { db } from "@/server/db";
import { holds } from "@/server/slots";
import { SlotTakenError } from "@/server/slots/types";
import { booking as rules } from "@/config/site";

export type MoveResult = { ok: true; start: Date; end: Date } | { ok: false; error: string };

/**
 * Moves a booking to a new start time of the same length, through the slot
 * engine (same locks, hours, buffers, closures and shared assets as a new
 * booking), so a move can never double-book.
 */
export async function moveBooking(id: string, newStartIso: string): Promise<MoveResult> {
  const b = await db.booking.findUnique({ where: { id } });
  if (!b || !["confirmed", "pending_payment"].includes(b.status)) return { ok: false, error: "Only confirmed or pending bookings can be moved." };
  const minutes = (b.end.getTime() - b.start.getTime()) / 60_000;
  // Free the old time by marking the booking as moving, then hold the new time inside the engine's lock.
  await db.booking.update({ where: { id }, data: { status: "rescheduling" } });
  try {
    const hold = await holds.create(b.packageId, newStartIso, minutes);
    await db.$transaction([
      db.booking.update({
        where: { id },
        data: { start: new Date(hold.start), end: new Date(hold.end), status: b.status, rescheduledFrom: b.start, rescheduleCount: { increment: 1 } },
      }),
      db.hold.delete({ where: { id: hold.id } }),
    ]);
    return { ok: true, start: new Date(hold.start), end: new Date(hold.end) };
  } catch (e) {
    await db.booking.update({ where: { id }, data: { status: b.status } });
    return { ok: false, error: e instanceof SlotTakenError ? "The new time is not free." : "The new time is outside opening hours or off the slot grid." };
  }
}

/** Why a guest may not move this booking online (null = allowed). */
export function guestRescheduleBlock(b: { status: string; start: Date; rescheduleCount: number }, now = Date.now()): string | null {
  if (!rules.selfReschedule) return "Online rescheduling is off. Message us on WhatsApp.";
  if (b.status !== "confirmed") return "Only confirmed bookings can be moved online.";
  if (b.rescheduleCount >= rules.rescheduleMaxTimes) return "This booking has already been moved. Message us on WhatsApp.";
  if ((b.start.getTime() - now) / 3600_000 < rules.rescheduleMinHours) return `Bookings can be moved online up to ${rules.rescheduleMinHours} hours before the start. Message us on WhatsApp.`;
  return null;
}
