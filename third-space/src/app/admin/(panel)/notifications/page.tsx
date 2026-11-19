import Link from "next/link";
import { db } from "@/server/db";
import { notificationSentAction } from "@/server/admin/actions";
import { whatsappHref } from "@/lib/business";
import { Card, fmtDateTime, H1, Status } from "@/components/admin/ui";

export default async function NotificationsPage() {
  const rows = await db.notification.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200 });
  return (
    <>
      <H1>Booking messages</H1>
      <p className="mb-4 text-sm text-muted">
        No WhatsApp/email provider is connected yet. Open each message, send it from the THIRD SPACE phone or mailbox, then mark it sent.
      </p>
      <Card>
        {rows.length === 0 && <p className="text-sm text-muted">Nothing to send.</p>}
        <ul className="divide-y divide-line/60" data-testid="notification-rows">
          {rows.map((n) => {
            const href = n.channel === "whatsapp" ? whatsappHref(`91${n.to}`, n.body) : `mailto:${n.to}?subject=${encodeURIComponent("THIRD SPACE booking confirmed")}&body=${encodeURIComponent(n.body)}`;
            return (
              <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-semibold">
                    {n.channel} → {n.to}
                  </span>{" "}
                  <Status value={n.status} />
                  <span className="block text-muted">
                    {fmtDateTime(n.createdAt)} · {n.bookingId && <Link href={`/admin/bookings/${n.bookingId}`} className="underline">{n.bookingId}</Link>}
                  </span>
                </span>
                {n.status === "queued" && (
                  <span className="flex gap-2">
                    {href && (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="ts-btn ts-btn-primary text-sm">
                        Open {n.channel === "whatsapp" ? "WhatsApp" : "email"}
                      </a>
                    )}
                    <form action={notificationSentAction}>
                      <input type="hidden" name="notificationId" value={n.id} />
                      <button className="ts-btn ts-btn-ghost text-sm">Mark sent</button>
                    </form>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
