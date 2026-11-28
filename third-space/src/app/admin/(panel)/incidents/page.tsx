import Link from "next/link";
import { db } from "@/server/db";
import { Card, fmtDateTime, H1, Status } from "@/components/admin/ui";

export default async function IncidentsPage() {
  const rows = await db.incident.findMany({ orderBy: [{ status: "desc" }, { occurredAt: "desc" }], take: 200 });
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <H1>Incident register</H1>
        <Link href="/admin/incidents/new" className="ts-btn ts-btn-primary text-sm">
          Report incident
        </Link>
      </div>
      <Card>
        {rows.length === 0 && <p className="text-sm text-muted">No incidents recorded.</p>}
        <ul className="divide-y divide-line/60" data-testid="incident-rows">
          {rows.map((i) => (
            <li key={i.id}>
              <Link href={`/admin/incidents/${i.id}`} className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-3 hover:bg-raised">
                <span>
                  <span className="font-semibold">
                    {fmtDateTime(i.occurredAt)} · {i.category.replace("_", " ")} · {i.severity}
                  </span>
                  <span className="block text-sm text-muted">
                    {i.bookingId ?? "No booking"} · {i.description.slice(0, 90)}
                  </span>
                </span>
                <Status value={i.status} />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
