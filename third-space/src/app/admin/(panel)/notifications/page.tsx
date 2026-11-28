import Link from "next/link";
import { db } from "@/server/db";
import { notificationSentAction } from "@/server/admin/actions";
import { saveNotificationSettingsAction } from "@/server/admin/manage";
import { requireRole } from "@/server/admin/auth";
import { providerStatus } from "@/server/notify";
import { ActionForm } from "@/components/admin/action-form";
import { Field } from "@/components/admin/ui";
import { whatsappHref } from "@/lib/business";
import { Card, fmtDateTime, H1, Status } from "@/components/admin/ui";

export default async function NotificationsPage() {
  await requireRole("notifications");
  const rows = await db.notification.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200 });
  const cfg = ((await db.setting.findUnique({ where: { key: "notifications" } }))?.value ?? {}) as { reminder24h?: boolean; reminder2h?: boolean; feedbackAfterHours?: number };
  const prov = providerStatus();
  return (
    <>
      <H1>Booking messages</H1>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title="Providers">
          <p className="text-sm">
            WhatsApp Business API: {prov.whatsapp ? "connected" : "not connected"} · Email: {prov.email ? "connected" : "not connected"}
          </p>
          <p className="mt-2 text-xs text-muted">
            With providers connected, messages send automatically (WhatsApp uses your approved templates, one per message type: WHATSAPP_TEMPLATE_BOOKING_CONFIRMED,
            …_PAYMENT_RECEIVED, …_REMINDER_24H, …_REMINDER_2H, …_RESCHEDULED, …_CANCELLED, …_RECORDING_READY, …_FEEDBACK_REQUEST, …_PAYMENT_PENDING). Until then, open each
            queued message below and send it from the THIRD SPACE phone or mailbox.
          </p>
        </Card>
        <Card title="Timing" testId="notification-settings">
          <ActionForm action={saveNotificationSettingsAction} submit="Save timing">
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" name="reminder24h" defaultChecked={cfg.reminder24h !== false} className="h-5 w-5" /> Reminder 24 hours before
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" name="reminder2h" defaultChecked={cfg.reminder2h !== false} className="h-5 w-5" /> Reminder 2 hours before
            </label>
            <Field label="Feedback request, hours after the session">
              <input name="feedbackAfterHours" type="number" min={1} max={72} defaultValue={cfg.feedbackAfterHours ?? 3} className="ts-input w-28" />
            </Field>
          </ActionForm>
        </Card>
      </div>
      <Card>
        {rows.length === 0 && <p className="text-sm text-muted">Nothing to send.</p>}
        <ul className="divide-y divide-line/60" data-testid="notification-rows">
          {rows.map((n) => {
            const href = n.channel === "whatsapp" ? whatsappHref(`91${n.to}`, n.body) : `mailto:${n.to}?subject=${encodeURIComponent("THIRD SPACE booking confirmed")}&body=${encodeURIComponent(n.body)}`;
            return (
              <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-semibold">
                    {n.kind.replace(/_/g, " ")} · {n.channel} → {n.to}
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
