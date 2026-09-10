import Link from "next/link";
import { Plus, Boxes } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SectionHeading, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { formatCurrency } from "@/lib/utils";
import { PART_CATEGORIES, stockLevelFor } from "@/lib/constants";

const LEVEL_TONE = { NORMAL: "success", LOW: "warning", CRITICAL: "danger", OUT_OF_STOCK: "danger" } as const;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; lowStock?: string }>;
}) {
  const { q, category, lowStock } = await searchParams;

  const parts = await prisma.part.findMany({
    where: {
      ...(category && { category }),
      ...(q && { OR: [{ name: { contains: q } }, { sku: { contains: q } }, { brand: { contains: q } }] }),
    },
    orderBy: { name: "asc" },
  });

  const withLevel = parts.map((p) => ({ ...p, level: stockLevelFor(p.quantity, p.minStock) }));
  const visible = lowStock === "true" ? withLevel.filter((p) => p.level !== "NORMAL") : withLevel;
  const lowStockCount = withLevel.filter((p) => p.level !== "NORMAL").length;

  return (
    <div>
      <SectionHeading
        title="Inventory"
        description="Every part in stock, with live low-stock alerts."
        action={
          <Link href="/inventory/new">
            <Button>
              <Plus className="size-4" /> Add Part
            </Button>
          </Link>
        }
      />

      <form className="mb-4 flex flex-wrap gap-2" action="/inventory">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search parts by name, SKU, brand…" className="max-w-xs" />
        <Select name="category" defaultValue={category ?? ""} className="max-w-[200px]">
          <option value="">All Categories</option>
          {PART_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm text-ink-600">
          <input type="checkbox" name="lowStock" value="true" defaultChecked={lowStock === "true"} className="size-4 rounded" />
          Low stock only ({lowStockCount})
        </label>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <Card>
        {visible.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Boxes} title="No parts found" description="Try a different filter or add a new part." />
          </div>
        ) : (
          <>
            <div className="divide-y divide-[var(--color-border)] sm:hidden">
              {visible.map((p) => (
                <Link key={p.id} href={`/inventory/${p.id}`} className="flex items-center justify-between gap-3 p-4 active:bg-ink-50">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-900">{p.name}</p>
                    <p className="text-xs text-ink-500">{p.category.replaceAll("_", " ")}{p.brand ? ` · ${p.brand}` : ""}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-ink-900">{p.quantity} in stock</p>
                    <Badge tone={LEVEL_TONE[p.level]}>{p.level.replaceAll("_", " ")}</Badge>
                  </div>
                </Link>
              ))}
            </div>
            <div className="hidden overflow-x-auto scroll-thin sm:block">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs font-semibold tracking-wide text-ink-400 uppercase">
                  <th className="px-4 py-3">Part</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Purchase Price</th>
                  <th className="px-4 py-3">Selling Price</th>
                  <th className="px-4 py-3">Location</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-ink-50/70">
                    <td className="px-4 py-3">
                      <Link href={`/inventory/${p.id}`} className="font-medium text-primary-700 hover:underline">
                        {p.name}
                      </Link>
                      {p.brand && <p className="text-xs text-ink-500">{p.brand}{p.model ? ` · ${p.model}` : ""}</p>}
                    </td>
                    <td className="px-4 py-3 text-ink-600">{p.category.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink-900">{p.quantity}</span>
                        <Badge tone={LEVEL_TONE[p.level]}>{p.level.replaceAll("_", " ")}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{formatCurrency(p.purchasePrice)}</td>
                    <td className="px-4 py-3 text-ink-600">{formatCurrency(p.sellingPrice)}</td>
                    <td className="px-4 py-3 text-ink-500">{p.location ?? "—"}</td>
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
