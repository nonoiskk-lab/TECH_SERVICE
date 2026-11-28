import Link from "next/link";
import { db } from "@/server/db";
import { requireRole } from "@/server/admin/auth";
import { formatINR } from "@/lib/pricing";
import { Card, H1, Status } from "@/components/admin/ui";

export default async function PackagesPage() {
  await requireRole("packages");
  const rows = await db.package.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <H1>Packages</H1>
        <Link href="/admin/packages/new" className="ts-btn ts-btn-primary text-sm">
          New package
        </Link>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="package-rows">
            <thead className="text-faint">
              <tr>
                <th className="py-2 pr-3">Package</th>
                <th className="py-2 pr-3">Space</th>
                <th className="py-2 pr-3">Starting price</th>
                <th className="py-2 pr-3">Rate/hr</th>
                <th className="py-2 pr-3">Duration</th>
                <th className="py-2 pr-3">Max guests</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-line/60">
                  <td className="py-2 pr-3">
                    <Link href={`/admin/packages/${p.id}`} className="font-semibold underline-offset-4 hover:underline">
                      {p.nameEn}
                    </Link>
                    {p.requiresLegalGate && <span className="ml-2 text-xs text-faint">(film licence gate)</span>}
                  </td>
                  <td className="py-2 pr-3">{p.resourceId === "room" ? "Theatre" : "Studio"}</td>
                  <td className="py-2 pr-3">{formatINR(p.startingPrice)}{p.pricePlus ? "+" : ""}</td>
                  <td className="py-2 pr-3">{p.ratePerHour ? formatINR(p.ratePerHour) : "—"}</td>
                  <td className="py-2 pr-3">{p.durationMinutes} min</td>
                  <td className="py-2 pr-3">{p.maxGuests}</td>
                  <td className="py-2 pr-3">
                    <Status value={p.active ? "active" : "hidden"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
