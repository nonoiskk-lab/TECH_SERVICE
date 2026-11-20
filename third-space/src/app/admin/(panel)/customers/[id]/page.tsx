import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireRole } from "@/server/admin/auth";
import { anonymiseCustomerAction } from "@/server/admin/manage";
import { BookingTable } from "@/components/admin/booking-table";
import { ActionForm } from "@/components/admin/action-form";
import { Card, H1 } from "@/components/admin/ui";
import { formatINR } from "@/lib/pricing";

export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  await requireRole("customers");
  const { id } = await params;
  const c = await db.customer.findUnique({ where: { id }, include: { bookings: { orderBy: { start: "desc" } }, memberships: true } });
  if (!c) notFound();
  const spent = c.bookings.reduce((a, b) => a + b.advancePaid, 0);
  return (
    <>
      <H1>{c.name}</H1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Contact">
          <p className="text-sm">
            {c.phone} · {c.email}
          </p>
          <p className="mt-1 text-sm text-muted">
            Marketing consent: {c.marketingConsent ? "yes" : "no"} · paid so far {formatINR(spent)}
          </p>
        </Card>
        <Card title="Creator Plans">
          {c.memberships.map((m) => (
            <p key={m.id} className="text-sm">
              {m.hoursTotal * 60 - m.minutesUsed} of {m.hoursTotal * 60} min left · {m.status} · until {m.validUntil.toISOString().slice(0, 10)}
            </p>
          ))}
          {c.memberships.length === 0 && <p className="text-sm text-muted">None.</p>}
        </Card>
        <Card title="Bookings">
          <BookingTable rows={c.bookings} />
        </Card>
        <Card title="Data deletion request" testId="anonymise">
          <ActionForm action={anonymiseCustomerAction} submit="Remove personal data" danger>
            <input type="hidden" name="customerId" value={c.id} />
            <p className="text-sm text-muted">
              Replaces name, phone, email and notes with placeholders on the customer and all their bookings. Booking, payment, consent and incident records
              stay (anonymised) because of tax and legal duties.
            </p>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
