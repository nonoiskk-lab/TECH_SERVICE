import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        supplierProducts: { include: { part: true }, orderBy: { updatedAt: "desc" } },
        purchaseOrders: { orderBy: { orderDate: "desc" }, include: { items: true } },
      },
    });
    if (!supplier) throw new ApiError(404, "Supplier not found.");
    return NextResponse.json({ supplier });
  } catch (err) {
    return errorResponse(err);
  }
}
