import { prisma } from "./prisma";
import { stockLevelFor } from "./constants";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfWeek() {
  const d = startOfToday();
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday as start of week
  d.setDate(d.getDate() - diff);
  return d;
}
function startOfMonth() {
  const d = startOfToday();
  d.setDate(1);
  return d;
}

const ACTIVE_STATUSES_EXCLUDE = ["CLOSED", "CANCELLED", "UNREPAIRABLE", "CUSTOMER_DECLINED"];

export async function getDashboardData() {
  const today = startOfToday();
  const week = startOfWeek();
  const month = startOfMonth();
  const now = new Date();

  const [
    newCount,
    diagnosisCount,
    approvalCount,
    repairCount,
    waitingPartsCount,
    readyCount,
    deliveredTodayCount,
    activeJobs,
    revenueToday,
    revenueWeek,
    revenueMonth,
    lowStockParts,
    recentJobs,
    completedThisMonth,
    technicians,
  ] = await Promise.all([
    prisma.serviceJob.count({ where: { status: "NEW" } }),
    prisma.serviceJob.count({ where: { status: "DIAGNOSIS" } }),
    prisma.serviceJob.count({ where: { status: "WAITING_APPROVAL" } }),
    prisma.serviceJob.count({ where: { status: "REPAIR_IN_PROGRESS" } }),
    prisma.serviceJob.count({ where: { status: { in: ["WAITING_FOR_PARTS", "PARTS_REQUIRED"] } } }),
    prisma.serviceJob.count({ where: { status: "READY_FOR_DELIVERY" } }),
    prisma.serviceJob.count({ where: { actualCompletionDate: { gte: today }, status: { in: ["DELIVERED", "CLOSED"] } } }),
    prisma.serviceJob.findMany({
      where: { status: { notIn: ACTIVE_STATUSES_EXCLUDE } },
      select: { approvedCost: true, estimatedCost: true, advancePaid: true, payments: { select: { amount: true } } },
    }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: today } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: week } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: month } } }),
    prisma.part.findMany({ orderBy: { quantity: "asc" } }),
    prisma.serviceJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: true, device: true, assignedTechnician: true },
    }),
    prisma.serviceJob.findMany({
      where: { status: "CLOSED", actualCompletionDate: { gte: month } },
      select: { createdAt: true, actualCompletionDate: true },
    }),
    prisma.user.findMany({
      where: { role: "TECHNICIAN" },
      include: {
        assignedJobs: {
          select: { status: true },
        },
      },
    }),
  ]);

  const pendingAmount = activeJobs.reduce((sum, j) => {
    const cost = j.approvedCost ?? j.estimatedCost ?? 0;
    const paid = j.payments.reduce((s, p) => s + p.amount, 0);
    const pending = cost - paid;
    return sum + (pending > 0 ? pending : 0);
  }, 0);

  const lowStock = lowStockParts
    .map((p) => ({ ...p, level: stockLevelFor(p.quantity, p.minStock) }))
    .filter((p) => p.level !== "NORMAL")
    .slice(0, 6);

  const delayedJobs = await prisma.serviceJob.count({
    where: {
      status: { notIn: [...ACTIVE_STATUSES_EXCLUDE, "DELIVERED"] },
      expectedCompletionDate: { lt: now },
    },
  });

  const pendingJobsCount = await prisma.serviceJob.count({
    where: { status: { notIn: ACTIVE_STATUSES_EXCLUDE } },
  });

  const avgRepairDays =
    completedThisMonth.length > 0
      ? completedThisMonth.reduce((sum, j) => {
          if (!j.actualCompletionDate) return sum;
          const diff = (j.actualCompletionDate.getTime() - j.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return sum + diff;
        }, 0) / completedThisMonth.length
      : 0;

  const technicianPerformance = technicians.map((t) => ({
    id: t.id,
    name: t.name,
    assigned: t.assignedJobs.length,
    completed: t.assignedJobs.filter((j) => j.status === "CLOSED" || j.status === "DELIVERED").length,
    active: t.assignedJobs.filter((j) => !ACTIVE_STATUSES_EXCLUDE.includes(j.status)).length,
  }));

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const recentPayments = await prisma.payment.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { amount: true, createdAt: true },
  });
  const revenueTrend = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(sevenDaysAgo);
    day.setDate(day.getDate() + i);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const total = recentPayments
      .filter((p) => p.createdAt >= day && p.createdAt < dayEnd)
      .reduce((s, p) => s + p.amount, 0);
    return { date: day.toLocaleDateString("en-IN", { weekday: "short" }), amount: total };
  });

  return {
    revenueTrend,
    statusCounts: {
      new: newCount,
      diagnosis: diagnosisCount,
      approval: approvalCount,
      repair: repairCount,
      waitingParts: waitingPartsCount,
      ready: readyCount,
      deliveredToday: deliveredTodayCount,
      pendingAmount,
    },
    revenue: {
      today: revenueToday._sum.amount ?? 0,
      week: revenueWeek._sum.amount ?? 0,
      month: revenueMonth._sum.amount ?? 0,
    },
    performance: {
      avgRepairDays,
      completedThisMonth: completedThisMonth.length,
      pendingJobs: pendingJobsCount,
      delayedJobs,
      technicians: technicianPerformance,
    },
    lowStock,
    recentJobs,
  };
}
