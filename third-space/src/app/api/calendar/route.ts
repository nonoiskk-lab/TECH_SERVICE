import type { NextRequest } from "next/server";
import { ensureCatalog } from "@/server/catalog";
import { monthAvailability } from "@/server/slots";
import { bookablePackage, json } from "@/lib/api";

/** Month view: available / full / unavailable for each date, for one package and session length. */
export async function GET(req: NextRequest) {
  await ensureCatalog();
  const sp = req.nextUrl.searchParams;
  const month = sp.get("month") ?? "";
  const pkg = bookablePackage(sp.get("packageId"));
  const duration = Number(sp.get("duration"));
  if (!pkg) return json({ error: "PACKAGE_NOT_BOOKABLE" }, 404);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !Number.isInteger(duration)) return json({ error: "BAD_REQUEST" }, 400);
  return json({ days: await monthAvailability(month, pkg.id, duration) });
}
