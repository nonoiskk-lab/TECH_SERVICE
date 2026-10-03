import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canDeleteRecords } from "@/lib/permissions";
import { SectionHeading, EmptyState, Avatar } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { CustomerActions } from "@/components/customers/customer-actions";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archived?: string }>;
}) {
  const { q, archived } = await searchParams;
  const session = await getSession();
  const canDelete = canDeleteRecords(session?.role ?? "FRONT_DESK");
  const showArchived = archived === "true";

  const customers = await prisma.customer.findMany({
    where: {
      isArchived: showArchived,
      ...(q && {
        OR: [
          { name: { contains: q } },
          { mobile: { contains: q } },
          { customerCode: { contains: q } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      jobs: { select: { createdAt: true, approvedCost: true, estimatedCost: true, payments: { select: { amount: true } } } },
    },
    take: 100,
  });

  const rows = customers.map((c) => ({
    ...c,
    totalSpending: c.jobs.reduce((s, j) => s + j.payments.reduce((s2, p) => s2 + p.amount, 0), 0),
    lastService: [...c.jobs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.createdAt,
  }));

  return (
    <div>
      <SectionHeading
        title="Customers"
        description={showArchived ? "Deleted customers — restore any of these to bring them back." : "Every customer who has ever visited, searchable by name, mobile or ID."}
        action={
          <Link href="/customers/new">
            <Button>
              <UserPlus className="size-4" /> New Customer
            </Button>
          </Link>
        }
      />

      <form className="mb-4 flex flex-wrap gap-2" action="/customers">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search by name, mobile or customer ID…" className="max-w-sm" />
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {canDelete && (
          <Link href={showArchived ? "/customers" : "/customers?archived=true"} className="ml-auto">
            <Button type="button" variant="ghost">
              {showArchived ? "Back to active customers" : "Deleted customers"}
            </Button>
          </Link>
        )}
      </form>

      <Card>
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title={showArchived ? "No deleted customers" : "No customers found"}
              description={showArchived ? "Nothing has been deleted yet." : q ? `No customers match "${q}".` : "Add your first customer to get started."}
              action={
                showArchived ? undefined : (
                  <Link href="/customers/new">
                    <Button variant="outline">
                      <UserPlus className="size-4" /> New Customer
                    </Button>
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className="divide-y divide-[var(--color-border)] sm:hidden">
              {rows.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-4">
                  <Link href={`/customers/${c.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                    <Avatar name={c.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink-900">{c.name}</p>
                      <p className="text-xs text-ink-500">
                        {c.customerCode} · {c.mobile}
                      </p>
                    </div>
                  </Link>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-ink-900">{formatCurrency(c.totalSpending)}</p>
                    {showArchived ? (
                      <Badge tone="danger">Deleted</Badge>
                    ) : (
                      <p className="text-xs text-ink-400">{c.jobs.length} job(s)</p>
                    )}
                    {canDelete && (
                      <div className="mt-2">
                        <CustomerActions
                          customer={{ ...c, whatsapp: c.whatsapp, email: c.email, address: c.address, notes: c.notes }}
                          canEdit={false}
                          canDelete
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto scroll-thin sm:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-xs font-semibold tracking-wide text-ink-400 uppercase">
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Mobile</th>
                    <th className="px-4 py-3">Total Services</th>
                    <th className="px-4 py-3">Total Spending</th>
                    <th className="px-4 py-3">Last Service</th>
                    {canDelete && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-ink-50/70">
                      <td className="px-4 py-3">
                        <Link href={`/customers/${c.id}`} className="flex items-center gap-2.5">
                          <Avatar name={c.name} />
                          <div>
                            <p className="font-medium text-ink-900">{c.name}</p>
                            <p className="text-xs text-ink-500">{c.customerCode}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-700">{c.mobile}</td>
                      <td className="px-4 py-3 text-ink-700">{c.jobs.length}</td>
                      <td className="px-4 py-3 font-medium text-ink-900">{formatCurrency(c.totalSpending)}</td>
                      <td className="px-4 py-3 text-ink-500">{c.lastService ? formatDate(c.lastService) : "—"}</td>
                      {canDelete && (
                        <td className="px-4 py-3 text-right">
                          <CustomerActions
                            customer={{ ...c, whatsapp: c.whatsapp, email: c.email, address: c.address, notes: c.notes }}
                            canEdit={false}
                            canDelete
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
