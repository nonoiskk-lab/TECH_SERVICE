import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["ADMIN", "SERVICE_MANAGER", "TECHNICIAN"]);
    const { id } = await params;
    const estimate = await prisma.estimate.findUnique({ where: { jobId: id } });
    if (!estimate) throw new ApiError(404, "No estimate found for this job yet.");

    const updated = await prisma.estimate.update({
      where: { jobId: id },
      data: { status: "SENT", sentAt: new Date() },
    });

    return NextResponse.json({ estimate: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
