import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { OR: [{ forRole: null }, { forRole: session.role }], isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
}
