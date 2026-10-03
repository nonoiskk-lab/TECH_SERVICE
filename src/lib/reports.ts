import { prisma } from "./prisma";

const TERMINAL_EXCLUDE = ["CLOSED", "CANCELLED", "UNREPAIRABLE", "CUSTOMER_DECLINED", "DELIVERED"];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfMonth() {
  const d = startOfToday();
  d.setDate(1);
  return d;
}

export async function getServiceReport() {
  const today = startOfToday();
  const month = startOfMonth();
  const now = new Date();

  const [dailyJobs, monthlyJobs, completedAll, completedThisMonth, pendingJobs, cancelledJobs, delayedJobs] =
    await Promise.all([
      prisma.serviceJob.count({ where: { createdAt: { gte: today } } }),
      prisma.serviceJob.count({ where: { createdAt: { gte: month } } }),
      prisma.serviceJob.count({ where: { status: "CLOSED" } }),
      prisma.serviceJob.count({ where: { status: "CLOSED", actualCompletionDate: { gte: month } } }),
      prisma.serviceJob.count({ where: { status: { notIn: TERMINAL_EXCLUDE } } }),
      prisma.serviceJob.count({ where: { status: "CANCELLED" } }),
      prisma.serviceJob.count({
        where: { status: { notIn: [...TERMINAL_EXCLUDE] }, expectedCompletionDate: { lt: now } },
      }),
    ]);

  return { dailyJobs, monthlyJobs, completedAll, completedThisMonth, pendingJobs, cancelledJobs, delayedJobs };
}

export async function getFinancialReport() {
  const today = startOfToday();
  const month = startOfMonth();

  const [revenueToday, revenueMonth, revenueAll, estimateItems, receivedPOs, jobParts] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: today } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: month } } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.estimateItem.findMany({ where: { estimate: { status: "APPROVED" } }, select: { type: true, total: true } }),
    prisma.purchaseOrder.aggregate({ _sum: { totalAmount: true }, where: { status: "RECEIVED" } }),
    prisma.jobPart.findMany({ select: { quantity: true, unitCost: true } }),
  ]);

  const labourRevenue = estimateItems.filter((i) => i.type === "LABOUR" || i.type === "SERVICE").reduce((s, i) => s + i.total, 0);
  const partsRevenue = estimateItems.filter((i) => i.type === "PART").reduce((s, i) => s + i.total, 0);
  const partsCost = jobParts.reduce((s, jp) => s + jp.quantity * jp.unitCost, 0);
  const expenses = receivedPOs._sum.totalAmount ?? 0;
  const revenue = revenueAll._sum.amount ?? 0;

  const jobsWithInvoice = await prisma.invoice.aggregate({ _sum: { pendingAmount: true } });

  return {
    revenueToday: revenueToday._sum.amount ?? 0,
    revenueMonth: revenueMonth._sum.amount ?? 0,
    revenueAll: revenue,
    labourRevenue,
    partsRevenue,
    outstandingPayments: jobsWithInvoice._sum.pendingAmount ?? 0,
    expenses,
    profit: revenue - partsCost,
  };
}

export async function getInventoryReport() {
  const parts = await prisma.part.findMany({
    where: { isArchived: false },
    include: { inventoryMovements: { where: { type: "SERVICE_USE" }, select: { quantity: true, createdAt: true } } },
  });

  const stockValue = parts.reduce((s, p) => s + p.quantity * p.purchasePrice, 0);
  const lowStock = parts.filter((p) => p.quantity <= p.minStock).sort((a, b) => a.quantity - b.quantity);

  const withUsage = parts.map((p) => ({
    id: p.id,
    name: p.name,
    quantity: p.quantity,
    used: p.inventoryMovements.reduce((s, m) => s + Math.abs(m.quantity), 0),
  }));
  const fastMoving = [...withUsage].sort((a, b) => b.used - a.used).filter((p) => p.used > 0).slice(0, 5);
  const slowMoving = [...withUsage].filter((p) => p.used === 0).slice(0, 5);

  const recentPurchases = await prisma.purchaseOrder.findMany({
    orderBy: { orderDate: "desc" },
    take: 10,
    include: { supplier: true, items: true },
  });

  return { stockValue, lowStock, fastMoving, slowMoving, recentPurchases };
}

export async function getTechnicianReport() {
  const technicians = await prisma.user.findMany({
    where: { role: "TECHNICIAN" },
    include: { assignedJobs: { select: { status: true, createdAt: true, actualCompletionDate: true } } },
  });

  return technicians.map((t) => {
    const completed = t.assignedJobs.filter((j) => j.status === "CLOSED" || j.status === "DELIVERED");
    const avgDays =
      completed.length > 0
        ? completed.reduce((s, j) => {
            if (!j.actualCompletionDate) return s;
            return s + (j.actualCompletionDate.getTime() - j.createdAt.getTime()) / 86400000;
          }, 0) / completed.length
        : 0;
    return {
      id: t.id,
      name: t.name,
      assigned: t.assignedJobs.length,
      completed: completed.length,
      pending: t.assignedJobs.filter((j) => !TERMINAL_EXCLUDE.includes(j.status)).length,
      avgDays,
    };
  });
}
