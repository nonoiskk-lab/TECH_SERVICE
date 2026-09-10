import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";
import { PAYMENT_STATUSES_PO } from "@/lib/constants";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, items: { include: { part: true } }, createdBy: true },
    });
    if (!purchaseOrder) throw new ApiError(404, "Purchase order not found.");
    return NextResponse.json({ purchaseOrder });
  } catch (err) {
    return errorResponse(err);
  }
}

const patchSchema = z.object({
  paymentStatus: z.enum(PAYMENT_STATUSES_PO).optional(),
  status: z.enum(["ORDERED", "CANCELLED"]).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["ADMIN", "SERVICE_MANAGER"]);
    const { id } = await params;
    const parsed = patchSchema.parse(await request.json());

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(parsed.paymentStatus && { paymentStatus: parsed.paymentStatus }),
        ...(parsed.status && { status: parsed.status }),
      },
    });

    return NextResponse.json({ purchaseOrder });
  } catch (err) {
    return errorResponse(err);
  }
}
