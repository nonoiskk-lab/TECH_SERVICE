import { timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { deliver, notifyBooking } from "@/server/notify";
import { ensureCatalog } from "@/server/catalog";

/**
 * Scheduled jobs. Call every 15 minutes with `Authorization: Bearer $CRON_SECRET`
 * (Vercel Cron sends this header; on the Hobby plan Vercel runs crons once a
 * day, so use an external scheduler such as cron-job.org for 15-minute runs).
 */
function authorised(req: Request) {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return false;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return got.length === secret.length && timingSafeEqual(Buffer.from(got), Buffer.from(secret));
}

async function run() {
  await ensureCatalog();
  const now = new Date();
  const report: Record<string, number> = {};
  const settings = (await db.setting.findUnique({ where: { key: "notifications" } }))?.value as { reminder24h?: boolean; reminder2h?: boolean; feedbackAfterHours?: number } | undefined;

  // 1. Online payments never finished: nudge once, then release the slot.
  const pending = await db.booking.findMany({ where: { status: "pending_payment" } });
  for (const b of pending) {
    const hold = b.holdId ? await db.hold.findUnique({ where: { id: b.holdId } }) : null;
    const ageMin = (now.getTime() - b.createdAt.getTime()) / 60_000;
    if (hold && hold.expiresAt > now) {
      if (ageMin > 5 && !(await db.notification.findFirst({ where: { bookingId: b.id, kind: "payment_pending" } }))) await notifyBooking(b.id, "payment_pending");
      continue;
    }
    await db.$transaction([
      db.booking.update({ where: { id: b.id }, data: { status: "cancelled", cancelledAt: now, cancelReason: "Payment not completed before the hold expired", holdId: null } }),
      db.hold.deleteMany({ where: { id: b.holdId ?? "" } }),
      db.payment.updateMany({ where: { bookingId: b.id, status: "created" }, data: { status: "failed", note: "expired" } }),
    ]);
    await audit(null, "system", "booking.payment_expired", "Booking", b.id);
    report.expired = (report.expired ?? 0) + 1;
  }

  // 2. Reminders (only when the booking was made earlier than the reminder point).
  const upcoming = await db.booking.findMany({ where: { status: "confirmed", start: { gt: now, lt: new Date(now.getTime() + 24 * 3600_000) } } });
  for (const b of upcoming) {
    const lead = b.start.getTime() - now.getTime();
    const made = b.start.getTime() - b.createdAt.getTime();
    const sent = new Set((await db.notification.findMany({ where: { bookingId: b.id, kind: { in: ["reminder_24h", "reminder_2h"] } } })).map((n) => n.kind));
    if (settings?.reminder2h !== false && lead <= 2 * 3600_000 && made > 2 * 3600_000 && !sent.has("reminder_2h")) {
      await notifyBooking(b.id, "reminder_2h");
      report.reminder2h = (report.reminder2h ?? 0) + 1;
    } else if (settings?.reminder24h !== false && lead > 2 * 3600_000 && made > 24 * 3600_000 && !sent.has("reminder_24h")) {
      await notifyBooking(b.id, "reminder_24h");
      report.reminder24h = (report.reminder24h ?? 0) + 1;
    }
  }

  // 3. Feedback after completed sessions.
  const after = (settings?.feedbackAfterHours ?? 3) * 3600_000;
  const done = await db.booking.findMany({ where: { status: "completed", end: { lt: new Date(now.getTime() - after), gt: new Date(now.getTime() - 7 * 86400_000) } } });
  for (const b of done) {
    if (!(await db.notification.findFirst({ where: { bookingId: b.id, kind: "feedback_request" } }))) {
      await notifyBooking(b.id, "feedback_request");
      report.feedback = (report.feedback ?? 0) + 1;
    }
  }

  // 4. Retry queued messages that are due.
  const queued = await db.notification.findMany({ where: { status: "queued", sendAfter: { lte: now } }, take: 100 });
  for (const n of queued) await deliver(n.id).catch(() => undefined);

  // 5. Retention: expired recording links past their delete date; old holds and rate-limit rows.
  const purge = await db.recordingFile.deleteMany({ where: { deleteAfter: { lt: now } } });
  report.recordingsPurged = purge.count;
  await db.hold.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 3600_000) }, NOT: { id: { in: pending.map((p) => p.holdId ?? "") } } } });
  await db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 86400_000) } } });

  // 6. Memberships past validity.
  const exp = await db.creatorMembership.updateMany({ where: { status: "active", validUntil: { lt: now } }, data: { status: "expired" } });
  report.membershipsExpired = exp.count;
  return report;
}

export async function GET(req: Request) {
  if (!authorised(req)) return new Response("Unauthorized", { status: 401 });
  return Response.json({ ok: true, ...(await run()) });
}
export const POST = GET;
