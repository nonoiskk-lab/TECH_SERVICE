import Link from "next/link";
import { Plus, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SectionHeading, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;

  const suppliers = await prisma.supplier.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { company: { contains: q } }, { city: { contains: q } }] } : {},
    orderBy: { name: "asc" },
    include: { _count: { select: { purchaseOrders: true, supplierProducts: true } } },
  });

  return (
    <div>
      <SectionHeading
        title="Suppliers"
        description="Every company and location you purchase parts from."
        action={
          <Link href="/suppliers/new">
            <Button>
              <Plus className="size-4" /> New Supplier
            </Button>
          </Link>
        }
      />

      <form className="mb-4 max-w-sm" action="/suppliers">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search by name, company or city…" />
      </form>

      {suppliers.length === 0 ? (
        <Card>
          <div className="p-6">
            <EmptyState icon={Truck} title="No suppliers yet" description="Add a supplier to start comparing prices and raising purchase orders." />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <Link key={s.id} href={`/suppliers/${s.id}`}>
              <Card className="h-full p-4 transition-shadow hover:shadow-[var(--shadow-popover)]">
                <p className="font-semibold text-ink-900">{s.name}</p>
                <p className="text-sm text-ink-500">{s.company}</p>
                <p className="mt-1 text-xs text-ink-400">{s.city ?? "No city set"}</p>
                <div className="mt-3 flex gap-4 text-xs text-ink-500">
                  <span>{s._count.supplierProducts} parts listed</span>
                  <span>{s._count.purchaseOrders} orders</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
