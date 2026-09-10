import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/api-helpers";

export async function GET() {
  try {
    await requireSession();
    const technicians = await prisma.user.findMany({
      where: { role: "TECHNICIAN", isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ technicians });
  } catch (err) {
    return errorResponse(err);
  }
}
