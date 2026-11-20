import type { NextRequest } from "next/server";
import { db } from "@/server/db";
import { currentSession, can, type Permission } from "@/server/admin/auth";
import { audit } from "@/server/audit";
import { bookingWhere } from "@/server/admin/queries";
import { toIstIso } from "@/server/slots/time";

/** CSV exports for staff. Values are quoted; formulas are neutralised for spreadsheet safety. */
function csv(rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

const NEED: Record<string, Permission> = { bookings: "bookings.view", payments: "payments", customers: "customers", revenue: "reports" };

export async function GET(req: NextRequest, ctx: RouteContext<"/admin/export/[kind]">) {
  const { kind } = await ctx.params;
  const me = await currentSession();
  if (!me || !NEED[kind] || !can(me.role, NEED[kind])) return new Response("Forbidden", { status: 403 });
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  let body = "";
  if (kind === "bookings") {
    const { where, orderBy } = bookingWhere(sp);
    const rows = await db.booking.findMany({ where, orderBy, take: 5000 });
    body = csv([
      ["Booking ID", "Status", "Package", "Space", "Start (IST)", "End (IST)", "Guest", "Phone", "Email", "Guests", "Subtotal", "Discount", "Coupon", "Tax", "Total", "Paid", "Due", "Source", "Created"],
      ...rows.map((b) => [b.id, b.status, b.packageName || b.packageId, b.resource, toIstIso(b.start), toIstIso(b.end), b.guestName, b.guestPhone, b.guestEmail, b.guestCount, b.subtotal, b.discount, b.couponCode, b.tax, b.total, b.advancePaid, b.balanceDue, b.source, b.createdAt.toISOString()]),
    ]);
  } else if (kind === "payments") {
    const rows = await db.payment.findMany({ orderBy: { createdAt: "desc" }, take: 10000 });
    body = csv([["Payment row", "Booking", "Provider", "Kind", "Status", "Amount", "Order", "Payment", "Refund", "Note", "Created"], ...rows.map((p) => [p.id, p.bookingId, p.provider, p.kind, p.status, p.amount, p.orderId, p.paymentId, p.refundId, p.note, p.createdAt.toISOString()])]);
  } else if (kind === "customers") {
    const rows = await db.customer.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { bookings: true } } }, take: 10000 });
    body = csv([["Name", "Phone", "Email", "Bookings", "Marketing consent", "Created"], ...rows.map((c) => [c.name, c.phone, c.email, c._count.bookings, c.marketingConsent ? "yes" : "no", c.createdAt.toISOString()])]);
  } else if (kind === "revenue") {
    const rows = await db.payment.findMany({ where: { status: { in: ["captured", "refunded"] } }, include: { booking: { select: { packageName: true, packageId: true, resource: true } } } });
    const byMonth = new Map<string, { gross: number; refunds: number }>();
    for (const p of rows) {
      const k = toIstIso(p.createdAt).slice(0, 7);
      const e = byMonth.get(k) ?? { gross: 0, refunds: 0 };
      if (p.kind === "refund") e.refunds += p.amount;
      else e.gross += p.amount;
      byMonth.set(k, e);
    }
    body = csv([["Month", "Collected", "Refunded", "Net"], ...[...byMonth.entries()].sort().map(([m, e]) => [m, e.gross, e.refunds, e.gross - e.refunds])]);
  }
  await audit(null, me.name, "export.csv", "Export", kind, { rows: body.split("\r\n").length - 1 });
  return new Response("﻿" + body, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="third-space-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" },
  });
}
