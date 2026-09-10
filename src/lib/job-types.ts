import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const jobDetailInclude = {
  customer: true,
  device: true,
  createdBy: true,
  assignedTechnician: true,
  statusHistory: { orderBy: { createdAt: "asc" }, include: { changedBy: true } },
  diagnosis: { include: { diagnosedBy: true } },
  estimate: { include: { items: { include: { part: true } } } },
  repairNotes: { orderBy: { createdAt: "desc" }, include: { technician: true } },
  photos: { orderBy: { createdAt: "desc" }, include: { uploadedBy: true } },
  jobParts: { include: { part: true, technician: true } },
  payments: { orderBy: { createdAt: "desc" }, include: { receivedBy: true } },
  invoice: true,
  warranty: true,
  whatsappMessages: { orderBy: { createdAt: "desc" }, include: { sentBy: true } },
  previousJob: { select: { id: true, jobNumber: true } },
  followUpJobs: { select: { id: true, jobNumber: true, status: true, createdAt: true } },
} satisfies Prisma.ServiceJobInclude;

// Derived from the actual `prisma` client instance (rather than the generic
// `Prisma.ServiceJobGetPayload` helper) so the global `omit: { user: {
// passwordHash: true } }` safety net in prisma.ts is correctly reflected —
// every nested user relation here (createdBy, assignedTechnician, etc.)
// comes back without passwordHash.
export type JobDetail = NonNullable<
  Awaited<ReturnType<typeof prisma.serviceJob.findUnique<{ where: { id: string }; include: typeof jobDetailInclude }>>>
>;
