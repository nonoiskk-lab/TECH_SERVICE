import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse, ApiError } from "@/lib/api-helpers";
import { hashPassword } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export async function GET() {
  try {
    await requireSession(["ADMIN"]);
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json({ users });
  } catch (err) {
    return errorResponse(err);
  }
}

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(ROLES),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  try {
    await requireSession(["ADMIN"]);
    const parsed = schema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { email: parsed.email.toLowerCase() } });
    if (existing) throw new ApiError(409, "A user with this email already exists.");

    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email.toLowerCase(),
        passwordHash: await hashPassword(parsed.password),
        role: parsed.role,
        phone: parsed.phone || null,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
