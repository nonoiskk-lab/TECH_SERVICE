import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 20), 50);

  const notifications = await prisma.notification.findMany({
    where: { OR: [{ forRole: null }, { forRole: session.role }] },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ notifications });
}
