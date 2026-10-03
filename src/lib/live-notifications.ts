import { prisma } from "./prisma";
import { stockLevelFor } from "./constants";

export type LiveAlert = {
  id: string;
  type: "LOW_STOCK" | "PAYMENT_PENDING" | "JOB_DELAYED" | "WARRANTY_EXPIRING";
  title: string;
  message: string;
  href?: string;
};

const TERMINAL_EXCLUDE = ["CLOSED", "CANCELLED", "UNREPAIRABLE", "CUSTOMER_DECLINED"];

/**
 * Computes live, always-current alerts rather than persisting them — stock
 * levels, pending payments, delays and warranty windows change continuously,
 * so a stored notification would silently go stale between recalculations.
 */
export async function getLiveAlerts(): Promise<LiveAlert[]> {
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 86400000);

  const [parts, activeJobs, warranties] = await Promise.all([
    prisma.part.findMany({ where: { isArchived: false } }),
    prisma.serviceJob.findMany({
      where: { status: { notIn: TERMINAL_EXCLUDE } },
      include: { customer: true, payments: true },
    }),
    prisma.warranty.findMany({
      where: { endDate: { gte: now, lte: soon } },
      include: { job: { include: { customer: true } } },
    }),
  ]);

  const alerts: LiveAlert[] = [];

  for (const p of parts) {
    const level = stockLevelFor(p.quantity, p.minStock);
    if (level !== "NORMAL") {
      alerts.push({
        id: `low-stock-${p.id}`,
        type: "LOW_STOCK",
        title: `${p.name} — ${level.replaceAll("_", " ")}`,
        message: `${p.quantity} unit(s) left (minimum ${p.minStock}).`,
        href: `/inventory/${p.id}`,
      });
    }
  }

  for (const job of activeJobs) {
    const paid = job.payments.reduce((s, p) => s + p.amount, 0);
    const total = job.approvedCost ?? job.estimatedCost ?? 0;
    if (total - paid > 0 && (job.status === "READY_FOR_DELIVERY" || job.status === "DELIVERED")) {
      alerts.push({
        id: `payment-${job.id}`,
        type: "PAYMENT_PENDING",
        title: "Payment pending",
        message: `${job.customer.name} has ${(total - paid).toFixed(0)} pending on ${job.jobNumber}.`,
        href: `/jobs/${job.id}`,
      });
    }
    if (job.expectedCompletionDate && job.expectedCompletionDate < now) {
      alerts.push({
        id: `delayed-${job.id}`,
        type: "JOB_DELAYED",
        title: "Job delayed",
        message: `${job.jobNumber} for ${job.customer.name} was expected ${job.expectedCompletionDate.toDateString()}.`,
        href: `/jobs/${job.id}`,
      });
    }
  }

  for (const w of warranties) {
    alerts.push({
      id: `warranty-${w.id}`,
      type: "WARRANTY_EXPIRING",
      title: "Warranty expiring soon",
      message: `${w.job.customer.name}'s warranty for ${w.job.jobNumber} ends ${w.endDate.toDateString()}.`,
      href: `/jobs/${w.jobId}`,
    });
  }

  return alerts;
}
