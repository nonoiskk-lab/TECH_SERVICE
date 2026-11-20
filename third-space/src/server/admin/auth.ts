import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureCatalog } from "@/server/catalog";

/**
 * Staff login. One shared ADMIN_PASSWORD plus the staff member's name, so the
 * audit log says who did what. Session is an HMAC-signed cookie (12 hours).
 * Swap for per-user accounts when the team grows.
 */
const COOKIE = "ts_admin";
const TTL_MS = 12 * 3600_000;

function secret() {
  const s = (process.env.AUTH_SECRET ?? "").trim();
  if (s.length < 16) throw new Error("AUTH_SECRET must be set (16+ characters) to use the admin panel");
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function adminEnabled() {
  return !!(process.env.ADMIN_PASSWORD ?? "").trim() && (process.env.AUTH_SECRET ?? "").trim().length >= 16;
}

export function checkPassword(input: string) {
  const want = Buffer.from((process.env.ADMIN_PASSWORD ?? "").trim());
  const got = Buffer.from(input);
  return want.length > 0 && want.length === got.length && timingSafeEqual(want, got);
}

export async function startSession(name: string) {
  const payload = Buffer.from(JSON.stringify({ name, exp: Date.now() + TTL_MS })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production" && !(process.env.SITE_URL ?? "").startsWith("http://"),
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentStaff(): Promise<string | null> {
  if (!adminEnabled()) return null;
  const raw = (await cookies()).get(COOKIE)?.value ?? "";
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sign(payload));
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { name, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { name: string; exp: number };
    return exp > Date.now() ? name : null;
  } catch {
    return null;
  }
}

/** Use at the top of every admin page and server action. */
export async function requireStaff(): Promise<string> {
  await ensureCatalog();
  const who = await currentStaff();
  if (!who) redirect("/admin/login");
  return who;
}
