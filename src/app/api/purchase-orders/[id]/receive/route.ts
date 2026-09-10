import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["ADMIN", "SERVICE_MANAGER"]);
    const { id } = await params;

    const po = await prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
      if (!existing) throw new ApiError(404, "Purchase order not found.");
      if (existing.status === "RECEIVED") throw new ApiError(400, "This purchase order was already received.");
      if (existing.status === "CANCELLED") throw new ApiError(400, "This purchase order was cancelled.");

      for (const item of existing.items) {
        await tx.part.update({ where: { id: item.partId }, data: { quantity: { increment: item.quantity } } });
        await tx.inventoryMovement.create({
          data: {
            partId: item.partId,
            type: "PURCHASE",
            quantity: item.quantity,
            note: `${existing.poNumber} received`,
            createdById: session.sub,
          },
        });
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: { status: "RECEIVED", receivedDate: new Date() },
        include: { items: { include: { part: true } }, supplier: true },
      });
    });

    return NextResponse.json({ purchaseOrder: po });
  } catch (err) {
    return errorResponse(err);
  }
}
