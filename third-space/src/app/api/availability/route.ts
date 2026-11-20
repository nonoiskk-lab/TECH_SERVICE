import { ensureCatalog } from "@/server/catalog";
import type { NextRequest } from "next/server";
import { availability } from "@/server/slots";
import { bookablePackage, json } from "@/lib/api";
import { bookingDates } from "@/lib/booking-dates";

export async function GET(req: NextRequest) {
  await ensureCatalog();
  const date = req.nextUrl.searchParams.get("date") ?? "";
  const pkg = bookablePackage(req.nextUrl.searchParams.get("packageId"));
  if (!pkg) return json({ error: "PACKAGE_NOT_BOOKABLE" }, 404);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "BAD_DATE" }, 400);
  const { minDate, maxDate } = bookingDates();
  if (date < minDate || date > maxDate) return json({ slots: [] });
  const duration = Number(req.nextUrl.searchParams.get("duration") ?? pkg.durationMinutes);
  return json({ slots: await availability.slotsFor(date, pkg.id, duration) });
}
