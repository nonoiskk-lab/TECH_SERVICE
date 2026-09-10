import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/api-helpers";

const schema = z.object({ note: z.string().trim().min(1, "Note cannot be empty.").max(2000) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["ADMIN", "SERVICE_MANAGER", "TECHNICIAN"]);
    const { id } = await params;
    const { note } = schema.parse(await request.json());

    const created = await prisma.repairNote.create({
      data: { jobId: id, technicianId: session.sub, note },
      include: { technician: true },
    });

    return NextResponse.json({ note: created }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
