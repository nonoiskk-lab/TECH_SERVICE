import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/api-helpers";
import { PART_CATEGORIES } from "@/lib/constants";

const partSchema = z.object({
  name: z.string().trim().min(1, "Part name is required.").max(150),
  category: z.enum(PART_CATEGORIES),
  brand: z.string().trim().max(60).optional().or(z.literal("")),
  model: z.string().trim().max(60).optional().or(z.literal("")),
  sku: z.string().trim().max(60).optional().or(z.literal("")),
  serialNumber: z.string().trim().max(60).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(2),
  purchasePrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  warrantyDays: z.coerce.number().int().min(0).optional().nullable(),
  location: z.string().trim().max(60).optional().or(z.literal("")),
  rack: z.string().trim().max(30).optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const sp = request.nextUrl.searchParams;
    const q = sp.get("q")?.trim();
    const category = sp.get("category");
    const lowStockOnly = sp.get("lowStock") === "true";
    const includeArchived = sp.get("includeArchived") === "true";

    const parts = await prisma.part.findMany({
      where: {
        ...(!includeArchived && { isArchived: false }),
        ...(category && { category }),
        ...(q && {
          OR: [{ name: { contains: q } }, { sku: { contains: q } }, { brand: { contains: q } }],
        }),
      },
      orderBy: { name: "asc" },
    });

    const filtered = lowStockOnly ? parts.filter((p) => p.quantity <= p.minStock) : parts;

    return NextResponse.json({ parts: filtered });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(["ADMIN", "SERVICE_MANAGER"]);
    const parsed = partSchema.parse(await request.json());

    const part = await prisma.part.create({
      data: {
        name: parsed.name,
        category: parsed.category,
        brand: parsed.brand || null,
        model: parsed.model || null,
        sku: parsed.sku || null,
        serialNumber: parsed.serialNumber || null,
        quantity: parsed.quantity,
        minStock: parsed.minStock,
        purchasePrice: parsed.purchasePrice,
        sellingPrice: parsed.sellingPrice,
        warrantyDays: parsed.warrantyDays ?? null,
        location: parsed.location || null,
        rack: parsed.rack || null,
      },
    });

    if (part.quantity > 0) {
      await prisma.inventoryMovement.create({
        data: {
          partId: part.id,
          type: "ADJUSTMENT",
          quantity: part.quantity,
          note: "Initial stock on creation",
          createdById: session.sub,
        },
      });
    }

    return NextResponse.json({ part }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
