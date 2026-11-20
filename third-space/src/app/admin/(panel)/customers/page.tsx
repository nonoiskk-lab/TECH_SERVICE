import Link from "next/link";
import { db } from "@/server/db";
import { requireRole } from "@/server/admin/auth";
import { Card, fmtDateTime, H1 } from "@/components/admin/ui";

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireRole("customers");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const rows = await db.customer.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q.replace(/\D/g, "") || q } }, { email: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { bookings: true } }, memberships: { where: { status: "active" } } },
    take: 300,
  });
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <H1>Customers</H1>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from a route handler */}
        <a href="/admin/export/customers" className="ts-btn ts-btn-ghost text-sm">
          Export CSV
        </a>
      </div>
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Name, phone or email" aria-label="Search" className="ts-input w-64" />
        <button className="ts-btn ts-btn-ghost text-sm">Search</button>
      </form>
      <Card>
        <ul className="divide-y divide-line/60 text-sm" data-testid="customer-rows">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/customers/${c.id}`} className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-2 hover:bg-raised">
                <span>
                  <strong>{c.name}</strong> · {c.phone} · {c.email}
                  {c.passwordHash ? <span className="ml-2 rounded border border-line px-1.5 text-xs text-ok">online account</span> : null}
                </span>
                <span className="text-muted">
                  {c._count.bookings} booking(s){c.memberships.length ? " · Creator Plan" : ""} · since {fmtDateTime(c.createdAt)}
                </span>
              </Link>
            </li>
          ))}
          {rows.length === 0 && <li className="py-2 text-muted">No customers.</li>}
        </ul>
      </Card>
    </>
  );
}
