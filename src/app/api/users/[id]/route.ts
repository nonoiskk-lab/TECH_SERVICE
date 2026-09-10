import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";
import { ROLES } from "@/lib/constants";

const schema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(ROLES).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["ADMIN"]);
    const { id } = await params;
    if (id === session.sub) throw new ApiError(400, "You cannot change your own account here.");

    const parsed = schema.parse(await request.json());
    const user = await prisma.user.update({ where: { id }, data: parsed });
    return NextResponse.json({ user });
  } catch (err) {
    return errorResponse(err);
  }
}
