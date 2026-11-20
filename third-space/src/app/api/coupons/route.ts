import { ensureCatalog } from "@/server/catalog";
import { findCoupon } from "@/server/coupons";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { json } from "@/lib/api";

/** Check a coupon code for a package. Returns its rule so the quote can show the discount. */
export async function POST(req: Request) {
  await ensureCatalog();
  if (!(await rateLimit(await clientKey("coupon"), 20, 600))) return json({ error: "RATE_LIMITED" }, 429);
  const body = (await req.json().catch(() => ({}))) as { code?: string; packageId?: string };
  if (typeof body.packageId !== "string") return json({ error: "BAD_REQUEST" }, 400);
  const rule = await findCoupon(body.code, body.packageId);
  return rule ? json({ ok: true, rule }) : json({ ok: false }, 404);
}
