import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { audit } from "@/server/audit";

/**
 * Private recording download. Needs both the file token and the booking's own
 * access token, and an unexpired link. The storage URL is never shown on a page.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/files/[token]">) {
  const { token } = await ctx.params;
  const bookingToken = req.nextUrl.searchParams.get("b") ?? "";
  const f = await db.recordingFile.findUnique({ where: { token }, include: { booking: { select: { accessToken: true, id: true } } } });
  if (!f || !bookingToken || f.booking.accessToken !== bookingToken) return new Response("Not found", { status: 404 });
  if (f.expiresAt <= new Date()) return new Response("This download link has expired. Message THIRD SPACE on WhatsApp for a new one.", { status: 410 });
  await db.recordingFile.update({ where: { id: f.id }, data: { downloads: { increment: 1 }, deliveredAt: f.deliveredAt ?? new Date() } });
  await audit(null, "guest", "recording.downloaded", "Booking", f.booking.id, { file: f.id });
  return Response.redirect(f.url, 302);
}
