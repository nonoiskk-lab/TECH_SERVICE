import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { canAccessSection } from "./lib/permissions";
import type { Role } from "./lib/constants";

const COOKIE_NAME = "repairflow_session";

// Public routes: the customer status portal and QR targets never require a
// login, and auth/static assets obviously can't be gated behind auth either.
const PUBLIC_PREFIXES = ["/login", "/status", "/api/auth/login", "/_next", "/favicon.ico", "/uploads"];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

async function verify(token: string | undefined) {
  if (!token) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload as { sub: string; role: Role; name: string; email: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = await verify(token);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/api")) {
    // API routes re-validate role per-handler; middleware only ensures a
    // logged-in session reaches them.
    return NextResponse.next();
  }

  if (!canAccessSection(session.role, pathname)) {
    const url = new URL("/dashboard", request.url);
    url.searchParams.set("denied", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
