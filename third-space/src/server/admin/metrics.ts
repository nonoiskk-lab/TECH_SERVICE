import "server-only";
import { db } from "@/server/db";
import { resourceRules } from "@/server/catalog";
import { addDays, istDateTime, istToday } from "@/server/slots/time";

const LIVE = ["confirmed", "checked_in", "in_progress", "completed"];

/** Minutes a resource is open over the next `days` days (closures not subtracted). */
function openMinutes(resource: string, days: number) {
  const r = resourceRules(resource);
  const [oh, om] = r.open.split(":").map(Number);
  const [ch, cm] = r.close.split(":").map(Number);
  return days * (ch * 60 + cm - (oh * 60 + om));
}

export async function dashboardMetrics(now = new Date()) {
  const today = istToday(now);
  const monthStart = istDateTime(`${today.slice(0, 7)}-01`, "00:00");
  const weekEnd = istDateTime(addDays(today, 7), "00:00");
  const todayStart = istDateTime(today, "00:00");
  const [payments, refunds, pending, upcoming, newCustomers, monthBookings, week] = await Promise.all([
    db.payment.findMany({ where: { status: "captured", kind: { not: "refund" } }, select: { amount: true, createdAt: true } }),
    db.payment.findMany({ where: { kind: "refund", status: "refunded" }, select: { amount: true, createdAt: true } }),
    db.booking.findMany({ where: { OR: [{ status: "pending_payment" }, { status: { in: ["confirmed", "checked_in"] }, balanceDue: { gt: 0 } }] }, select: { status: true, balanceDue: true } }),
    db.booking.count({ where: { status: { in: ["confirmed", "pending_payment"] }, start: { gte: now, lt: weekEnd } } }),
    db.customer.count({ where: { createdAt: { gte: monthStart } } }),
    db.booking.findMany({ where: { createdAt: { gte: monthStart } }, select: { status: true } }),
    db.booking.findMany({ where: { status: { in: LIVE }, start: { gte: todayStart, lt: weekEnd } }, select: { resource: true, start: true, end: true } }),
  ]);
  const sum = (xs: { amount: number }[]) => xs.reduce((a, b) => a + b.amount, 0);
  const inMonth = <T extends { createdAt: Date }>(xs: T[]) => xs.filter((x) => x.createdAt >= monthStart);
  const util = (resource: string) => {
    const used = week.filter((b) => b.resource === resource).reduce((a, b) => a + (b.end.getTime() - b.start.getTime()) / 60_000, 0);
    const open = openMinutes(resource, 7);
    return open ? Math.round((used / open) * 100) : 0;
  };
  const cancelled = monthBookings.filter((b) => ["cancelled", "refund_pending", "refunded"].includes(b.status)).length;
  return {
    revenueMonth: sum(inMonth(payments)) - sum(inMonth(refunds)),
    revenueAll: sum(payments) - sum(refunds),
    pendingPayments: pending.filter((b) => b.status === "pending_payment").length,
    balanceDue: pending.filter((b) => b.status !== "pending_payment").reduce((a, b) => a + b.balanceDue, 0),
    upcoming7: upcoming,
    theatreUtil: util("room"),
    studioUtil: util("studio"),
    newCustomers,
    cancellationRate: monthBookings.length ? Math.round((cancelled / monthBookings.length) * 100) : 0,
    cancelledMonth: cancelled,
    bookingsMonth: monthBookings.length,
  };
}
