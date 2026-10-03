import Link from "next/link";
import { Plus, Boxes } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canDeleteRecords } from "@/lib/permissions";
import { SectionHeading, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { PartActions } from "@/components/inventory/part-actions";
import { formatCurrency } from "@/lib/utils";
import { PART_CATEGORIES, stockLevelFor } from "@/lib/constants";

const LEVEL_TONE = { NORMAL: "success", LOW: "warning", CRITICAL: "danger", OUT_OF_STOCK: "danger" } as const;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; lowStock?: string; archived?: string }>;
}) {
  const { q, category, lowStock, archived } = await searchParams;
  const session = await getSession();
  const canDelete = canDeleteRecords(session?.role ?? "FRONT_DESK");
  const showArchived = archived === "true";

  const parts = await prisma.part.findMany({
    where: {
      isArchived: showArchived,
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
        description={showArchived ? "Deleted parts — restore any of these to put them back in active stock." : "Every part in stock, with live low-stock alerts."}
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
        {!showArchived && (
          <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm text-ink-600">
            <input type="checkbox" name="lowStock" value="true" defaultChecked={lowStock === "true"} className="size-4 rounded" />
            Low stock only ({lowStockCount})
          </label>
        )}
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {canDelete && (
          <Link href={showArchived ? "/inventory" : "/inventory?archived=true"} className="ml-auto">
            <Button type="button" variant="ghost">
              {showArchived ? "Back to active inventory" : "Deleted parts"}
            </Button>
          </Link>
        )}
      </form>

      <Card>
        {visible.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Boxes}
              title={showArchived ? "No deleted parts" : "No parts found"}
              description={showArchived ? "Nothing has been deleted yet." : "Try a different filter or add a new part."}
            />
          </div>
        ) : (
          <>
            <div className="divide-y divide-[var(--color-border)] sm:hidden">
              {visible.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                  <Link href={`/inventory/${p.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink-900">{p.name}</p>
                    <p className="text-xs text-ink-500">{p.category.replaceAll("_", " ")}{p.brand ? ` · ${p.brand}` : ""}</p>
                  </Link>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-ink-900">{p.quantity} in stock</p>
                    <Badge tone={showArchived ? "neutral" : LEVEL_TONE[p.level]}>
                      {showArchived ? "Deleted" : p.level.replaceAll("_", " ")}
                    </Badge>
                    {canDelete && (
                      <div className="mt-2">
                        <PartActions partId={p.id} partName={p.name} isArchived={p.isArchived} />
                      </div>
                    )}
                  </div>
                </div>
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
                  {canDelete && <th className="px-4 py-3" />}
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
                        <Badge tone={showArchived ? "neutral" : LEVEL_TONE[p.level]}>
                          {showArchived ? "Deleted" : p.level.replaceAll("_", " ")}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{formatCurrency(p.purchasePrice)}</td>
                    <td className="px-4 py-3 text-ink-600">{formatCurrency(p.sellingPrice)}</td>
                    <td className="px-4 py-3 text-ink-500">{p.location ?? "—"}</td>
                    {canDelete && (
                      <td className="px-4 py-3 text-right">
                        <PartActions partId={p.id} partName={p.name} isArchived={p.isArchived} />
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
