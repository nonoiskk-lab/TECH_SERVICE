import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Recomputes and upserts the Invoice for a job from its approved/estimated
 * cost and payments so far. Called after any payment or cost change so the
 * invoice never drifts out of sync with the underlying records.
 */
export async function syncInvoiceForJob(tx: Tx, jobId: string) {
  const job = await tx.serviceJob.findUniqueOrThrow({
    where: { id: jobId },
    include: { payments: true, estimate: true },
  });

  const total = job.approvedCost ?? job.estimate?.total ?? job.estimatedCost ?? 0;
  if (total <= 0 && job.payments.length === 0) return null;

  const paidAmount = job.payments.reduce((s, p) => s + p.amount, 0);
  const pendingAmount = Math.max(0, total - paidAmount);
  const status = pendingAmount <= 0 && total > 0 ? "PAID" : paidAmount > 0 ? "PARTIALLY_PAID" : "ISSUED";

  const existing = await tx.invoice.findUnique({ where: { jobId } });
  if (existing) {
    return tx.invoice.update({
      where: { jobId },
      data: {
        subtotal: job.estimate?.subtotal ?? total,
        discount: job.estimate?.discount ?? 0,
        taxAmount: job.estimate?.taxAmount ?? 0,
        total,
        paidAmount,
        pendingAmount,
        status,
      },
    });
  }

  const year = new Date().getFullYear();
  const likePrefix = `INV-${year}-`;
  const count = await tx.invoice.count({ where: { invoiceNumber: { startsWith: likePrefix } } });
  const invoiceNumber = `${likePrefix}${String(count + 1).padStart(5, "0")}`;

  return tx.invoice.create({
    data: {
      jobId,
      invoiceNumber,
      subtotal: job.estimate?.subtotal ?? total,
      discount: job.estimate?.discount ?? 0,
      taxAmount: job.estimate?.taxAmount ?? 0,
      total,
      paidAmount,
      pendingAmount,
      status,
    },
  });
}
