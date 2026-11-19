import Link from "next/link";
import { contact, isLegalGateOpen } from "@/config/site";
import { missingLegalFields, policyStatus } from "@/config/policies";
import { db } from "@/server/db";
import { otp } from "@/server/otp";
import { paymentService } from "@/server/payments";
import { addDays, istDateTime, istToday } from "@/server/slots/time";
import { BookingTable } from "@/components/admin/booking-table";
import { Card, H1 } from "@/components/admin/ui";

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : istToday();
  const from = istDateTime(date, "00:00");
  const to = istDateTime(addDays(date, 1), "00:00");
  const [bookings, openIncidents, queued, paidAfterExpiry] = await Promise.all([
    db.booking.findMany({ where: { start: { gte: from, lt: to } }, orderBy: { start: "asc" } }),
    db.incident.count({ where: { status: "open" } }),
    db.notification.count({ where: { status: "queued" } }),
    db.auditLog.count({ where: { action: "payment.captured_after_hold_expired" } }),
  ]);

  const missing = missingLegalFields();
  const checks: { label: string; ok: boolean; note: string }[] = [
    { label: "Legal Gate (theatre)", ok: true, note: isLegalGateOpen() ? "Open: theatre bookable" : "Closed: theatre hidden" },
    { label: "Policy text approved by advocate", ok: policyStatus() === "final", note: policyStatus() === "final" ? "POLICY_STATUS=final" : "Draft banner shown (POLICY_STATUS)" },
    { label: "Legal entity and grievance details", ok: missing.length === 0, note: missing.length ? `Missing: ${missing.join(", ")}` : "Set" },
    { label: "Public phone / WhatsApp / address", ok: !!(contact.phone && contact.addressLine), note: contact.phone && contact.addressLine ? "Set" : "THIRD_SPACE_PHONE / THIRD_SPACE_ADDRESS_LINE missing" },
    { label: "Payments", ok: paymentService().provider === "razorpay", note: paymentService().provider === "razorpay" ? "Razorpay keys set" : "Mock: no money is collected" },
    { label: "OTP delivery", ok: !otp.isMock, note: otp.isMock ? "Mock: code 123456 shown on screen" : "SMS mode" },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <H1>Bookings on {date}</H1>
        <form className="flex gap-2">
          <input type="date" name="date" defaultValue={date} className="ts-input w-auto" aria-label="Date" />
          <button className="ts-btn ts-btn-ghost text-sm">Show</button>
        </form>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Link href="/admin/incidents" className="ts-card p-4 hover:border-warm">
          <p className="text-sm text-muted">Open incidents</p>
          <p className="text-3xl font-extrabold" data-testid="open-incidents">{openIncidents}</p>
        </Link>
        <Link href="/admin/notifications" className="ts-card p-4 hover:border-warm">
          <p className="text-sm text-muted">Messages to send</p>
          <p className="text-3xl font-extrabold">{queued}</p>
        </Link>
        <Link href="/admin/audit?action=payment.captured_after_hold_expired" className="ts-card p-4 hover:border-warm">
          <p className="text-sm text-muted">Paid after hold expired (refund/rebook)</p>
          <p className={`text-3xl font-extrabold ${paidAfterExpiry ? "text-danger" : ""}`}>{paidAfterExpiry}</p>
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card title="Schedule">
          <BookingTable rows={bookings} empty="No bookings on this date." />
        </Card>
        <Card title="Go-live readiness" testId="readiness">
          <ul className="space-y-2 text-sm">
            {checks.map((c) => (
              <li key={c.label} className="flex gap-2">
                <span aria-hidden="true" className={c.ok ? "text-ok" : "text-warm"}>
                  {c.ok ? "✓" : "!"}
                </span>
                <span>
                  <span className="font-semibold">{c.label}</span>
                  <span className="block text-muted">{c.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
