import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";
import { jobUpdateSchema } from "@/lib/validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const job = await prisma.serviceJob.findUnique({
      where: { id },
      include: {
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
      },
    });
    if (!job) throw new ApiError(404, "Service job not found.");

    return NextResponse.json({ job });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["ADMIN", "SERVICE_MANAGER", "FRONT_DESK", "TECHNICIAN"]);
    const { id } = await params;
    const body = await request.json();
    const { isArchived, ...rest } = body as { isArchived?: boolean; [key: string]: unknown };
    const parsed = jobUpdateSchema.parse(rest);

    // Archiving/restoring a job is a delete-equivalent action — only Admin,
    // even though the other roles can edit the regular fields above.
    if (isArchived !== undefined && session.role !== "ADMIN") {
      throw new ApiError(403, "Only an Admin can delete or restore a job.");
    }

    const job = await prisma.serviceJob.update({
      where: { id },
      data: {
        ...(parsed.priority !== undefined && { priority: parsed.priority }),
        ...(parsed.assignedTechnicianId !== undefined && { assignedTechnicianId: parsed.assignedTechnicianId }),
        ...(parsed.expectedCompletionDate !== undefined && { expectedCompletionDate: parsed.expectedCompletionDate }),
        ...(parsed.complaintText !== undefined && { complaintText: parsed.complaintText }),
        ...(parsed.additionalNotes !== undefined && { additionalNotes: parsed.additionalNotes }),
        ...(parsed.estimatedCost !== undefined && { estimatedCost: parsed.estimatedCost }),
        ...(typeof isArchived === "boolean" && { isArchived }),
      },
    });

    return NextResponse.json({ job });
  } catch (err) {
    return errorResponse(err);
  }
}
