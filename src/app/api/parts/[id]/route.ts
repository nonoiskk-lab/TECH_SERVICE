import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";
import { z } from "zod";
import { PART_CATEGORIES } from "@/lib/constants";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const part = await prisma.part.findUnique({
      where: { id },
      include: {
        supplierOptions: { include: { supplier: true }, orderBy: { price: "asc" } },
        inventoryMovements: { orderBy: { createdAt: "desc" }, take: 50, include: { createdBy: true, job: { select: { id: true, jobNumber: true } } } },
      },
    });
    if (!part) throw new ApiError(404, "Part not found.");
    return NextResponse.json({ part });
  } catch (err) {
    return errorResponse(err);
  }
}

const updateSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  category: z.enum(PART_CATEGORIES).optional(),
  brand: z.string().trim().max(60).optional().or(z.literal("")),
  model: z.string().trim().max(60).optional().or(z.literal("")),
  sku: z.string().trim().max(60).optional().or(z.literal("")),
  minStock: z.coerce.number().int().min(0).optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  warrantyDays: z.coerce.number().int().min(0).optional().nullable(),
  location: z.string().trim().max(60).optional().or(z.literal("")),
  rack: z.string().trim().max(30).optional().or(z.literal("")),
  isArchived: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["ADMIN", "SERVICE_MANAGER"]);
    const { id } = await params;
    const parsed = updateSchema.parse(await request.json());

    // Archiving/restoring a part is a delete-equivalent action — only Admin,
    // even though Service Manager can edit the other fields on this route.
    if (parsed.isArchived !== undefined && session.role !== "ADMIN") {
      throw new ApiError(403, "Only an Admin can delete or restore a part.");
    }

    const part = await prisma.part.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined && { name: parsed.name }),
        ...(parsed.category !== undefined && { category: parsed.category }),
        ...(parsed.brand !== undefined && { brand: parsed.brand || null }),
        ...(parsed.model !== undefined && { model: parsed.model || null }),
        ...(parsed.sku !== undefined && { sku: parsed.sku || null }),
        ...(parsed.minStock !== undefined && { minStock: parsed.minStock }),
        ...(parsed.purchasePrice !== undefined && { purchasePrice: parsed.purchasePrice }),
        ...(parsed.sellingPrice !== undefined && { sellingPrice: parsed.sellingPrice }),
        ...(parsed.warrantyDays !== undefined && { warrantyDays: parsed.warrantyDays }),
        ...(parsed.location !== undefined && { location: parsed.location || null }),
        ...(parsed.rack !== undefined && { rack: parsed.rack || null }),
        ...(parsed.isArchived !== undefined && { isArchived: parsed.isArchived }),
      },
    });

    return NextResponse.json({ part });
  } catch (err) {
    return errorResponse(err);
  }
}
