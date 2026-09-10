import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SectionHeading, EmptyState, Avatar } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { mobile: { contains: q } },
            { customerCode: { contains: q } },
          ],
        }
      : {},
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
        description="Every customer who has ever visited, searchable by name, mobile or ID."
        action={
          <Link href="/customers/new">
            <Button>
              <UserPlus className="size-4" /> New Customer
            </Button>
          </Link>
        }
      />

      <form className="mb-4 max-w-sm" action="/customers">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search by name, mobile or customer ID…" />
      </form>

      <Card>
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title="No customers found"
              description={q ? `No customers match "${q}".` : "Add your first customer to get started."}
              action={
                <Link href="/customers/new">
                  <Button variant="outline">
                    <UserPlus className="size-4" /> New Customer
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div className="divide-y divide-[var(--color-border)] sm:hidden">
              {rows.map((c) => (
                <Link key={c.id} href={`/customers/${c.id}`} className="block p-4 active:bg-ink-50">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink-900">{c.name}</p>
                      <p className="text-xs text-ink-500">
                        {c.customerCode} · {c.mobile}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink-900">{formatCurrency(c.totalSpending)}</p>
                      <p className="text-xs text-ink-400">{c.jobs.length} job(s)</p>
                    </div>
                  </div>
                </Link>
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
