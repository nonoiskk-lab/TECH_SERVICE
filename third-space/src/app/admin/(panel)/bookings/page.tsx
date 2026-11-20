import Link from "next/link";
import { bookingWhere, STATUSES } from "@/server/admin/queries";
import { db } from "@/server/db";
import { requireRole, can } from "@/server/admin/auth";
import { BookingTable } from "@/components/admin/booking-table";
import { Card, H1 } from "@/components/admin/ui";

export default async function BookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const me = await requireRole("bookings.view");
  const sp = await searchParams;
  const { where, orderBy } = bookingWhere(sp);
  const rows = await db.booking.findMany({ where, orderBy, take: 300 });
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]).toString();
  const v = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <H1>Bookings</H1>
        <div className="flex gap-2">
          <a href={`/admin/export/bookings?${qs}`} className="ts-btn ts-btn-ghost text-sm" data-testid="export-bookings">
            Export CSV
          </a>
          {can(me.role, "bookings.manage") && (
            <Link href="/admin/bookings/new" className="ts-btn ts-btn-primary text-sm">
              New booking
            </Link>
          )}
        </div>
      </div>
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={v("q")} placeholder="ID, phone or name" aria-label="Search" className="ts-input w-56" />
        <select name="status" defaultValue={v("status")} className="ts-input w-44" aria-label="Status">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? s.replace("_", " ") : "Any status"}
            </option>
          ))}
        </select>
        <select name="resource" defaultValue={v("resource")} className="ts-input w-40" aria-label="Space">
          <option value="">Both spaces</option>
          <option value="room">Private Theatre</option>
          <option value="studio">Studio</option>
        </select>
        <select name="when" defaultValue={v("when") || "upcoming"} className="ts-input w-36" aria-label="When">
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
          <option value="all">All</option>
        </select>
        <select name="sort" defaultValue={v("sort") || "start"} className="ts-input w-40" aria-label="Sort">
          <option value="start">By session time</option>
          <option value="created">Newest first</option>
          <option value="total">Highest total</option>
        </select>
        <button className="ts-btn ts-btn-ghost text-sm">Filter</button>
      </form>
      <Card>
        <BookingTable rows={rows} />
      </Card>
    </>
  );
}
