import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession, type SessionPayload } from "./auth";
import type { Role } from "./constants";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireSession(allowedRoles?: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "You must be signed in to do this.");
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new ApiError(403, "You don't have permission to do this.");
  }
  return session;
}

export function withErrorHandling<T>(fn: () => Promise<T>) {
  return (async () => {
    try {
      const data = await fn();
      return NextResponse.json(data);
    } catch (err) {
      return errorResponse(err);
    }
  })();
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Invalid input.", issues: err.issues },
      { status: 400 }
    );
  }
  // Prisma "record not found" style errors
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code === "P2025") return NextResponse.json({ error: "Record not found." }, { status: 404 });
    if (code === "P2002") return NextResponse.json({ error: "A record with these details already exists." }, { status: 409 });
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong on our end. Please try again." }, { status: 500 });
}
