import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { Card, fmtDateTime, H1 } from "@/components/admin/ui";

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const action = typeof sp.action === "string" ? sp.action : "";
  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action } : {}),
    ...(q ? { OR: [{ entityId: q }, { actor: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const rows = await db.auditLog.findMany({ where, orderBy: { at: "desc" }, take: 300 });
  return (
    <>
      <H1>Audit log</H1>
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Booking ID or staff name" aria-label="Search" className="ts-input w-64" />
        <button className="ts-btn ts-btn-ghost text-sm">Search</button>
      </form>
      <Card>
        <ul className="divide-y divide-line/60 text-sm" data-testid="audit-rows">
          {rows.map((r) => (
            <li key={r.id} className="py-2">
              <span className="text-muted">{fmtDateTime(r.at)}</span> · <strong>{r.actor}</strong> · {r.action} · {r.entity} {r.entityId ?? ""}
              {r.details ? <code className="mt-1 block break-all text-xs text-faint">{JSON.stringify(r.details)}</code> : null}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
