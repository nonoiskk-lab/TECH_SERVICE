import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/api-helpers";

const schema = z.object({
  diagnosisText: z.string().trim().max(2000).optional().or(z.literal("")),
  rootCause: z.string().trim().max(2000).optional().or(z.literal("")),
  recommendedRepair: z.string().trim().max(2000).optional().or(z.literal("")),
  partsRequired: z.array(z.string()).max(30).optional(),
  labourRequired: z.string().trim().max(200).optional().or(z.literal("")),
  estimatedTimeHours: z.coerce.number().min(0).max(1000).optional().nullable(),
  estimatedCost: z.coerce.number().min(0).optional().nullable(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["ADMIN", "SERVICE_MANAGER", "TECHNICIAN"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = schema.parse(body);

    const diagnosis = await prisma.diagnosis.upsert({
      where: { jobId: id },
      update: {
        diagnosisText: parsed.diagnosisText || null,
        rootCause: parsed.rootCause || null,
        recommendedRepair: parsed.recommendedRepair || null,
        partsRequired: parsed.partsRequired ? JSON.stringify(parsed.partsRequired) : null,
        labourRequired: parsed.labourRequired || null,
        estimatedTimeHours: parsed.estimatedTimeHours ?? null,
        estimatedCost: parsed.estimatedCost ?? null,
        diagnosedById: session.sub,
      },
      create: {
        jobId: id,
        diagnosisText: parsed.diagnosisText || null,
        rootCause: parsed.rootCause || null,
        recommendedRepair: parsed.recommendedRepair || null,
        partsRequired: parsed.partsRequired ? JSON.stringify(parsed.partsRequired) : null,
        labourRequired: parsed.labourRequired || null,
        estimatedTimeHours: parsed.estimatedTimeHours ?? null,
        estimatedCost: parsed.estimatedCost ?? null,
        diagnosedById: session.sub,
      },
    });

    return NextResponse.json({ diagnosis });
  } catch (err) {
    return errorResponse(err);
  }
}
