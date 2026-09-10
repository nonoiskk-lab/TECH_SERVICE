import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";

const schema = z.object({
  type: z.enum(["RETURN", "DAMAGED", "ADJUSTMENT"]),
  quantity: z.coerce.number().int().refine((v) => v !== 0, "Quantity cannot be zero."),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["ADMIN", "SERVICE_MANAGER"]);
    const { id } = await params;
    const { type, quantity, note } = schema.parse(await request.json());

    const part = await prisma.$transaction(async (tx) => {
      const existing = await tx.part.findUnique({ where: { id } });
      if (!existing) throw new ApiError(404, "Part not found.");
      if (existing.quantity + quantity < 0) {
        throw new ApiError(400, "This adjustment would make stock negative.");
      }

      await tx.inventoryMovement.create({
        data: { partId: id, type, quantity, note: note || null, createdById: session.sub },
      });

      return tx.part.update({ where: { id }, data: { quantity: { increment: quantity } } });
    });

    return NextResponse.json({ part });
  } catch (err) {
    return errorResponse(err);
  }
}
