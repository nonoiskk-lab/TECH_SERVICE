import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionCookie, verifyPassword } from "@/lib/auth";
import type { Role } from "@/lib/constants";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const { email, password } = parsed.data;

  // Deliberately vague error to avoid leaking which emails exist.
  const genericError = NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    omit: { passwordHash: false },
  });
  if (!user || !user.isActive) return genericError;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return genericError;

  await createSessionCookie({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
  });

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
