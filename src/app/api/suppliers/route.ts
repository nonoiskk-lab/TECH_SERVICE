import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/api-helpers";

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required.").max(120),
  company: z.string().trim().min(1, "Company name is required.").max(150),
  contactPerson: z.string().trim().max(100).optional().or(z.literal("")),
  mobile: z.string().trim().max(20).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  gst: z.string().trim().max(30).optional().or(z.literal("")),
  paymentTerms: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const suppliers = await prisma.supplier.findMany({
      where: q
        ? { OR: [{ name: { contains: q } }, { company: { contains: q } }, { city: { contains: q } }] }
        : {},
      orderBy: { name: "asc" },
      include: { _count: { select: { purchaseOrders: true, supplierProducts: true } } },
    });
    return NextResponse.json({ suppliers });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession(["ADMIN", "SERVICE_MANAGER"]);
    const parsed = supplierSchema.parse(await request.json());
    const supplier = await prisma.supplier.create({
      data: {
        name: parsed.name,
        company: parsed.company,
        contactPerson: parsed.contactPerson || null,
        mobile: parsed.mobile || null,
        whatsapp: parsed.whatsapp || null,
        email: parsed.email || null,
        address: parsed.address || null,
        city: parsed.city || null,
        gst: parsed.gst || null,
        paymentTerms: parsed.paymentTerms || null,
        notes: parsed.notes || null,
      },
    });
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
