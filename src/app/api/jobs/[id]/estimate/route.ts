import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";
import { ESTIMATE_ITEM_TYPES } from "@/lib/constants";

const itemSchema = z.object({
  type: z.enum(ESTIMATE_ITEM_TYPES),
  description: z.string().trim().min(1, "Description is required."),
  quantity: z.coerce.number().min(0.01).default(1),
  unitPrice: z.coerce.number().min(0),
  partId: z.string().optional().nullable(),
});

const schema = z.object({
  items: z.array(itemSchema).min(1, "Add at least one line item."),
  discount: z.coerce.number().min(0).default(0),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["ADMIN", "SERVICE_MANAGER", "TECHNICIAN"]);
    const { id } = await params;
    const job = await prisma.serviceJob.findUnique({ where: { id } });
    if (!job) throw new ApiError(404, "Service job not found.");

    const parsed = schema.parse(await request.json());
    const subtotal = parsed.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const discount = Math.min(parsed.discount, subtotal);
    const taxAmount = ((subtotal - discount) * parsed.taxPercent) / 100;
    const total = subtotal - discount + taxAmount;

    const estimate = await prisma.$transaction(async (tx) => {
      await tx.estimate.upsert({
        where: { jobId: id },
        update: { subtotal, discount, taxPercent: parsed.taxPercent, taxAmount, total, status: "DRAFT" },
        create: { jobId: id, subtotal, discount, taxPercent: parsed.taxPercent, taxAmount, total, status: "DRAFT" },
      });
      const est = await tx.estimate.findUniqueOrThrow({ where: { jobId: id } });
      await tx.estimateItem.deleteMany({ where: { estimateId: est.id } });
      await tx.estimateItem.createMany({
        data: parsed.items.map((i) => ({
          estimateId: est.id,
          type: i.type,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.quantity * i.unitPrice,
          partId: i.partId || null,
        })),
      });
      return tx.estimate.findUniqueOrThrow({ where: { jobId: id }, include: { items: true } });
    });

    await prisma.serviceJob.update({ where: { id }, data: { estimatedCost: total } });

    return NextResponse.json({ estimate });
  } catch (err) {
    return errorResponse(err);
  }
}
