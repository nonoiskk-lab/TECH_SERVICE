import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/api-helpers";
import { SUPPLIER_AVAILABILITY } from "@/lib/constants";

const schema = z.object({
  partId: z.string().min(1),
  price: z.coerce.number().min(0),
  availability: z.enum(SUPPLIER_AVAILABILITY).default("AVAILABLE"),
  location: z.string().trim().max(60).optional().or(z.literal("")),
  deliveryEstimate: z.string().trim().max(60).optional().or(z.literal("")),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["ADMIN", "SERVICE_MANAGER"]);
    const { id } = await params;
    const parsed = schema.parse(await request.json());

    const supplierProduct = await prisma.supplierProduct.upsert({
      where: { supplierId_partId: { supplierId: id, partId: parsed.partId } },
      update: {
        price: parsed.price,
        availability: parsed.availability,
        location: parsed.location || null,
        deliveryEstimate: parsed.deliveryEstimate || null,
      },
      create: {
        supplierId: id,
        partId: parsed.partId,
        price: parsed.price,
        availability: parsed.availability,
        location: parsed.location || null,
        deliveryEstimate: parsed.deliveryEstimate || null,
      },
      include: { part: true },
    });

    return NextResponse.json({ supplierProduct }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
