import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";
import { syncInvoiceForJob } from "@/lib/invoice";

const schema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "NEED_MORE_TIME"]),
  customerNote: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["ADMIN", "SERVICE_MANAGER", "FRONT_DESK"]);
    const { id } = await params;
    const { status, customerNote } = schema.parse(await request.json());

    const estimate = await prisma.estimate.findUnique({ where: { jobId: id } });
    if (!estimate) throw new ApiError(404, "No estimate found for this job yet.");

    const updated = await prisma.$transaction(async (tx) => {
      const est = await tx.estimate.update({
        where: { jobId: id },
        data: { status, respondedAt: new Date(), customerNote: customerNote || null },
      });
      if (status === "APPROVED") {
        await tx.serviceJob.update({ where: { id }, data: { approvedCost: est.total } });
        await syncInvoiceForJob(tx, id);
      }
      await tx.auditLog.create({
        data: {
          actorId: session.sub,
          action: "ESTIMATE_RESPONSE",
          entityType: "Estimate",
          entityId: est.id,
          afterJson: JSON.stringify({ status }),
        },
      });
      return est;
    });

    return NextResponse.json({ estimate: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
