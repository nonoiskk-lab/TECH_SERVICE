import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { BookingTable } from "@/components/admin/booking-table";
import { Card, H1 } from "@/components/admin/ui";

const STATUSES = ["", "confirmed", "checked_in", "completed", "cancelled", "stopped", "no_show"];

export default async function BookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" && STATUSES.includes(sp.status) ? sp.status : "";
  const when = sp.when === "past" ? "past" : "upcoming";
  const where: Prisma.BookingWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? { OR: [{ id: { contains: q.toUpperCase() } }, { guestPhone: { contains: q.replace(/\D/g, "") || q } }, { guestName: { contains: q, mode: "insensitive" } }] }
      : when === "upcoming"
        ? { end: { gte: new Date() } }
        : { end: { lt: new Date() } }),
  };
  const rows = await db.booking.findMany({ where, orderBy: { start: when === "past" ? "desc" : "asc" }, take: 200 });
  return (
    <>
      <H1>Bookings</H1>
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="ID, phone or name" aria-label="Search" className="ts-input w-56" />
        <select name="status" defaultValue={status} className="ts-input w-40" aria-label="Status">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? s.replace("_", " ") : "Any status"}
            </option>
          ))}
        </select>
        <select name="when" defaultValue={when} className="ts-input w-36" aria-label="When">
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </select>
        <button className="ts-btn ts-btn-ghost text-sm">Filter</button>
      </form>
      <Card>
        <BookingTable rows={rows} />
      </Card>
    </>
  );
}
