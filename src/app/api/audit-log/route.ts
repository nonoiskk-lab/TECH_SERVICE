import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/api-helpers";

export async function GET() {
  try {
    await requireSession(["ADMIN"]);
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { actor: true },
    });
    return NextResponse.json({ logs });
  } catch (err) {
    return errorResponse(err);
  }
}
