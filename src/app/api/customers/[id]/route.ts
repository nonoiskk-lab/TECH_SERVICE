import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";
import { customerInputSchema } from "@/lib/validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        devices: { orderBy: { createdAt: "desc" } },
        jobs: {
          orderBy: { createdAt: "desc" },
          include: { device: true, assignedTechnician: true, payments: true },
        },
      },
    });
    if (!customer) throw new ApiError(404, "Customer not found.");

    const totalSpending = customer.jobs.reduce(
      (sum, j) => sum + j.payments.reduce((s, p) => s + p.amount, 0),
      0
    );
    const lastServiceDate = customer.jobs[0]?.createdAt ?? null;

    return NextResponse.json({ customer, totalSpending, lastServiceDate, totalServices: customer.jobs.length });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["ADMIN", "SERVICE_MANAGER", "FRONT_DESK"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = customerInputSchema.partial().parse(body);

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined && { name: parsed.name }),
        ...(parsed.mobile !== undefined && { mobile: parsed.mobile }),
        ...(parsed.whatsapp !== undefined && { whatsapp: parsed.whatsapp || null }),
        ...(parsed.email !== undefined && { email: parsed.email || null }),
        ...(parsed.address !== undefined && { address: parsed.address || null }),
        ...(parsed.customerType !== undefined && { customerType: parsed.customerType }),
        ...(parsed.notes !== undefined && { notes: parsed.notes || null }),
      },
    });

    return NextResponse.json({ customer });
  } catch (err) {
    return errorResponse(err);
  }
}
