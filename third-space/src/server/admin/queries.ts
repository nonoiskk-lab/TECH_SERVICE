import "server-only";
import type { Prisma } from "@prisma/client";

export const STATUSES = ["", "pending_payment", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "refund_pending", "refunded", "no_show", "stopped"];

export function bookingWhere(sp: Record<string, string | string[] | undefined>): { where: Prisma.BookingWhereInput; orderBy: Prisma.BookingOrderByWithRelationInput } {
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" && STATUSES.includes(sp.status) ? sp.status : "";
  const resource = sp.resource === "room" || sp.resource === "studio" ? sp.resource : "";
  const when = sp.when === "past" ? "past" : sp.when === "all" ? "all" : "upcoming";
  const sort = sp.sort === "created" ? "created" : sp.sort === "total" ? "total" : "start";
  const where: Prisma.BookingWhereInput = {
    ...(status ? { status } : {}),
    ...(resource ? { resource } : {}),
    ...(q
      ? { OR: [{ id: { contains: q.toUpperCase() } }, { guestPhone: { contains: q.replace(/\D/g, "") || q } }, { guestName: { contains: q, mode: "insensitive" } }] }
      : when === "upcoming"
        ? { end: { gte: new Date() } }
        : when === "past"
          ? { end: { lt: new Date() } }
          : {}),
  };
  const dir = when === "past" || sort !== "start" ? "desc" : "asc";
  const orderBy: Prisma.BookingOrderByWithRelationInput = sort === "created" ? { createdAt: dir } : sort === "total" ? { total: dir } : { start: dir };
  return { where, orderBy };
}

