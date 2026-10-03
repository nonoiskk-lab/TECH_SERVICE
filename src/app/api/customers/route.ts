import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/api-helpers";
import { customerInputSchema } from "@/lib/validation";
import { nextCustomerCode } from "@/lib/sequence";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    const pageSize = Math.min(50, Number(request.nextUrl.searchParams.get("pageSize") ?? 20));
    const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";

    const where = {
      ...(!includeArchived && { isArchived: false }),
      ...(q && {
        OR: [
          { name: { contains: q } },
          { mobile: { contains: q } },
          { customerCode: { contains: q } },
          { whatsapp: { contains: q } },
          { email: { contains: q } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { jobs: true } },
          jobs: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, approvedCost: true, estimatedCost: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({ customers, total, page, pageSize });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession(["ADMIN", "SERVICE_MANAGER", "FRONT_DESK"]);
    const body = await request.json();
    const parsed = customerInputSchema.parse(body);

    const existing = await prisma.customer.findFirst({ where: { mobile: parsed.mobile } });
    if (existing) {
      return NextResponse.json({ customer: existing, existed: true });
    }

    const customer = await prisma.customer.create({
      data: {
        customerCode: await nextCustomerCode(),
        name: parsed.name,
        mobile: parsed.mobile,
        whatsapp: parsed.whatsapp || parsed.mobile,
        email: parsed.email || null,
        address: parsed.address || null,
        customerType: parsed.customerType,
        notes: parsed.notes || null,
      },
    });

    return NextResponse.json({ customer, existed: false }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
