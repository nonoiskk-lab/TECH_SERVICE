import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";

const schema = z.object({
  partId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(1000),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["ADMIN", "SERVICE_MANAGER", "TECHNICIAN"]);
    const { id: jobId } = await params;
    const { partId, quantity } = schema.parse(await request.json());

    const jobPart = await prisma.$transaction(async (tx) => {
      const part = await tx.part.findUnique({ where: { id: partId } });
      if (!part) throw new ApiError(404, "Part not found.");
      if (part.quantity < quantity) {
        throw new ApiError(400, `Only ${part.quantity} unit(s) of "${part.name}" in stock.`);
      }

      const created = await tx.jobPart.create({
        data: {
          jobId,
          partId,
          technicianId: session.sub,
          quantity,
          unitCost: part.purchasePrice,
          unitPrice: part.sellingPrice,
        },
        include: { part: true, technician: true },
      });

      await tx.part.update({ where: { id: partId }, data: { quantity: { decrement: quantity } } });

      await tx.inventoryMovement.create({
        data: {
          partId,
          type: "SERVICE_USE",
          quantity: -quantity,
          jobId,
          createdById: session.sub,
          note: `Used on job`,
        },
      });

      return created;
    });

    return NextResponse.json({ jobPart }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
