import Link from "next/link";
import { db } from "@/server/db";
import { requireRole } from "@/server/admin/auth";
import { revokeRecordingAction } from "@/server/admin/manage";
import { Card, fmtDateTime, H1 } from "@/components/admin/ui";

export default async function RecordingsPage() {
  await requireRole("recordings");
  const rows = await db.recordingFile.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const now = new Date();
  return (
    <>
      <H1>Recording delivery</H1>
      <p className="mb-4 text-sm text-muted">
        Attach files from a studio booking&apos;s page. Guests download through a private THIRD SPACE link that checks the booking and the expiry; the storage
        link is never shown. Recordings are never published without the guest&apos;s separate written permission.
      </p>
      <Card>
        <ul className="divide-y divide-line/60 text-sm" data-testid="recording-rows">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <Link href={`/admin/bookings/${r.bookingId}`} className="underline">
                  {r.bookingId}
                </Link>{" "}
                · {r.label} · {r.expiresAt > now ? `link open until ${fmtDateTime(r.expiresAt)}` : "link expired"} · {r.downloads} download(s)
                {r.deliveredAt ? ` · sent ${fmtDateTime(r.deliveredAt)}` : " · not sent"}
                {r.deleteAfter ? ` · record deleted after ${fmtDateTime(r.deleteAfter)}` : ""}
              </span>
              {r.expiresAt > now && (
                <form action={revokeRecordingAction}>
                  <input type="hidden" name="fileId" value={r.id} />
                  <button className="text-xs text-danger underline">Revoke now</button>
                </form>
              )}
            </li>
          ))}
          {rows.length === 0 && <li className="py-2 text-muted">No files yet.</li>}
        </ul>
      </Card>
    </>
  );
}
