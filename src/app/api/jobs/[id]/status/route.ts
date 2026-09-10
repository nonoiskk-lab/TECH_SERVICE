import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";
import { statusChangeSchema } from "@/lib/validation";
import { JOB_STATUS_TRANSITIONS, STATUS_TO_TEMPLATE, type JobStatus } from "@/lib/constants";
import { syncInvoiceForJob } from "@/lib/invoice";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["ADMIN", "SERVICE_MANAGER", "TECHNICIAN", "FRONT_DESK"]);
    const { id } = await params;
    const body = await request.json();
    const { status: nextStatus, note } = statusChangeSchema.parse(body);

    const job = await prisma.serviceJob.findUnique({
      where: { id },
      include: { customer: true, device: true },
    });
    if (!job) throw new ApiError(404, "Service job not found.");

    const currentStatus = job.status as JobStatus;
    const allowed = JOB_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(nextStatus) && currentStatus !== nextStatus) {
      throw new ApiError(
        400,
        `Cannot move a job from "${currentStatus.replaceAll("_", " ")}" to "${nextStatus.replaceAll("_", " ")}".`
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const isDelivered = nextStatus === "DELIVERED";
      const jobUpdate = await tx.serviceJob.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(isDelivered && { actualCompletionDate: new Date() }),
        },
        include: { customer: true, device: true },
      });

      await tx.serviceJobStatusHistory.create({
        data: { jobId: id, status: nextStatus, changedById: session.sub, note: note || null },
      });

      await tx.auditLog.create({
        data: {
          actorId: session.sub,
          action: "STATUS_CHANGE",
          entityType: "ServiceJob",
          entityId: id,
          beforeJson: JSON.stringify({ status: currentStatus }),
          afterJson: JSON.stringify({ status: nextStatus }),
        },
      });

      if (nextStatus === "WAITING_APPROVAL") {
        await tx.notification.create({
          data: {
            type: "APPROVAL_NEEDED",
            title: "Estimate awaiting approval",
            message: `${jobUpdate.customer.name}'s estimate for ${jobUpdate.jobNumber} needs approval.`,
            jobId: id,
          },
        });
      }
      if (nextStatus === "READY_FOR_DELIVERY") {
        await tx.notification.create({
          data: {
            type: "READY_FOR_DELIVERY",
            title: "Job ready for pickup",
            message: `${jobUpdate.customer.name}'s ${jobUpdate.device.brand} ${jobUpdate.device.model} (${jobUpdate.jobNumber}) is ready.`,
            jobId: id,
          },
        });
      }

      if (isDelivered) {
        await syncInvoiceForJob(tx, id);

        const existingWarranty = await tx.warranty.findUnique({ where: { jobId: id } });
        if (!existingWarranty) {
          const settings = await tx.settings.findUnique({ where: { id: 1 } });
          const periodDays = settings?.defaultWarrantyDays ?? 90;
          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + periodDays);
          await tx.warranty.create({
            data: {
              jobId: id,
              periodDays,
              startDate,
              endDate,
              terms: `${periodDays}-day warranty on the repair work performed. Does not cover new physical or liquid damage.`,
            },
          });
        }
      }

      return jobUpdate;
    });

    return NextResponse.json({
      job: updated,
      suggestedWhatsAppTemplate: STATUS_TO_TEMPLATE[nextStatus] ?? null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
