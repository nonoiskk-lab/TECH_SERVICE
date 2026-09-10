import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/api-helpers";

const itemSchema = z.object({
  partId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitCost: z.coerce.number().min(0),
});

const schema = z.object({
  supplierId: z.string().min(1, "Select a supplier."),
  invoiceNumber: z.string().trim().max(60).optional().or(z.literal("")),
  taxAmount: z.coerce.number().min(0).default(0),
  shippingAmount: z.coerce.number().min(0).default(0),
  items: z.array(itemSchema).min(1, "Add at least one part to the order."),
});

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const status = request.nextUrl.searchParams.get("status");
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: status ? { status } : {},
      orderBy: { orderDate: "desc" },
      include: { supplier: true, items: { include: { part: true } }, createdBy: true },
    });
    return NextResponse.json({ purchaseOrders });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(["ADMIN", "SERVICE_MANAGER"]);
    const parsed = schema.parse(await request.json());

    const itemsTotal = parsed.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
    const totalAmount = itemsTotal + parsed.taxAmount + parsed.shippingAmount;

    const year = new Date().getFullYear();
    const likePrefix = `PO-${year}-`;
    const existingCount = await prisma.purchaseOrder.count({ where: { poNumber: { startsWith: likePrefix } } });
    const poNumber = `${likePrefix}${String(existingCount + 1).padStart(5, "0")}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: parsed.supplierId,
        invoiceNumber: parsed.invoiceNumber || null,
        status: "ORDERED",
        taxAmount: parsed.taxAmount,
        shippingAmount: parsed.shippingAmount,
        totalAmount,
        paymentStatus: "UNPAID",
        createdById: session.sub,
        items: {
          create: parsed.items.map((i) => ({ partId: i.partId, quantity: i.quantity, unitCost: i.unitCost, total: i.quantity * i.unitCost })),
        },
      },
      include: { items: { include: { part: true } }, supplier: true },
    });

    return NextResponse.json({ purchaseOrder: po }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
