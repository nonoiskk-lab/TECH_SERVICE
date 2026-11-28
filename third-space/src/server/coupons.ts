import "server-only";
import { db } from "@/server/db";
import type { CouponRule } from "@/lib/pricing";

/** A coupon that is active, in date, under its use limit and valid for the package. */
export async function findCoupon(code: string | undefined, packageId: string): Promise<CouponRule | null> {
  const c = code?.trim().toUpperCase();
  if (!c) return null;
  const row = await db.coupon.findUnique({ where: { code: c } });
  const now = new Date();
  if (!row || !row.active) return null;
  if (row.validFrom && row.validFrom > now) return null;
  if (row.validUntil && row.validUntil < now) return null;
  if (row.maxUses !== null && row.usedCount >= row.maxUses) return null;
  if (row.packageIds.length > 0 && !row.packageIds.includes(packageId)) return null;
  return { code: row.code, kind: row.kind === "flat" ? "flat" : "percent", value: row.value, minSubtotal: row.minSubtotal, packageIds: row.packageIds };
}
