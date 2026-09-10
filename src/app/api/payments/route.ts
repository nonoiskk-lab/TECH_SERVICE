import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/api-helpers";
import { syncInvoiceForJob } from "@/lib/invoice";
import { PAYMENT_METHODS, PAYMENT_TYPES } from "@/lib/constants";

const schema = z.object({
  jobId: z.string().min(1, "Select a service job."),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  method: z.enum(PAYMENT_METHODS),
  type: z.enum(PAYMENT_TYPES),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const jobId = request.nextUrl.searchParams.get("jobId");
    const payments = await prisma.payment.findMany({
      where: jobId ? { jobId } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { receivedBy: true, job: { include: { customer: true, device: true } } },
    });
    return NextResponse.json({ payments });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(["ADMIN", "SERVICE_MANAGER", "FRONT_DESK"]);
    const parsed = schema.parse(await request.json());

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          jobId: parsed.jobId,
          amount: parsed.amount,
          method: parsed.method,
          type: parsed.type,
          note: parsed.note || null,
          receivedById: session.sub,
        },
        include: { job: { include: { customer: true } }, receivedBy: true },
      });

      if (parsed.type === "ADVANCE") {
        await tx.serviceJob.update({ where: { id: parsed.jobId }, data: { advancePaid: { increment: parsed.amount } } });
      }

      await syncInvoiceForJob(tx, parsed.jobId);

      return created;
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
