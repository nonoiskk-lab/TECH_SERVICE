import "server-only";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureCatalog } from "@/server/catalog";
import { db } from "@/server/db";

/**
 * Staff authentication and role-based access control.
 *
 * Staff sign in with email + password (scrypt hashes in StaffUser). The
 * session is an HMAC-signed cookie (12 h) carrying the staff id and role; the
 * role is re-read from the database on each request, so deactivating someone
 * takes effect at once. The shared ADMIN_PASSWORD (+ any name) still works as
 * a bootstrap Super Admin login so the owner can create the first accounts.
 */
const COOKIE = "ts_admin";
const TTL_MS = 12 * 3600_000;
const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const ROLES = ["super_admin", "studio_manager", "booking_manager", "finance_manager", "staff"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  studio_manager: "Studio Manager",
  booking_manager: "Booking Manager",
  finance_manager: "Finance Manager",
  staff: "Staff",
};

export type Permission =
  | "dashboard"
  | "bookings.view"
  | "bookings.manage"
  | "checkin"
  | "calendar"
  | "customers"
  | "packages"
  | "payments"
  | "coupons"
  | "memberships"
  | "reports"
  | "staff"
  | "notifications"
  | "settings"
  | "recordings"
  | "incidents"
  | "content"
  | "leads"
  | "audit";

const PERMS: Record<Role, Permission[] | "all"> = {
  super_admin: "all",
  studio_manager: ["dashboard", "bookings.view", "bookings.manage", "checkin", "calendar", "customers", "packages", "memberships", "recordings", "incidents", "content", "leads", "notifications", "reports", "audit"],
  booking_manager: ["dashboard", "bookings.view", "bookings.manage", "checkin", "calendar", "customers", "memberships", "incidents", "leads", "notifications"],
  finance_manager: ["dashboard", "bookings.view", "payments", "coupons", "reports", "customers", "audit"],
  staff: ["dashboard", "bookings.view", "checkin", "incidents"],
};

export function can(role: Role, p: Permission) {
  const r = PERMS[role];
  return r === "all" || r.includes(p);
}

export type StaffSession = { id: string; name: string; role: Role };

function secret() {
  const s = (process.env.AUTH_SECRET ?? "").trim();
  if (s.length < 16) throw new Error("AUTH_SECRET must be set (16+ characters) to use the admin panel");
  return s;
}
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function adminEnabled() {
  return (process.env.AUTH_SECRET ?? "").trim().length >= 16;
}

/** Bootstrap check for the shared owner password. */
export function checkPassword(input: string) {
  const want = Buffer.from((process.env.ADMIN_PASSWORD ?? "").trim());
  const got = Buffer.from(input);
  return want.length > 0 && want.length === got.length && timingSafeEqual(want, got);
}

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [alg, s, k] = stored.split("$");
  if (alg !== "scrypt" || !s || !k) return false;
  const key = await scrypt(pw, Buffer.from(s, "base64"), 64);
  const want = Buffer.from(k, "base64");
  return key.length === want.length && timingSafeEqual(key, want);
}

export async function startSession(s: StaffSession) {
  const payload = Buffer.from(JSON.stringify({ ...s, exp: Date.now() + TTL_MS })).toString("base64url");
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

export async function currentSession(): Promise<StaffSession | null> {
  if (!adminEnabled()) return null;
  const raw = (await cookies()).get(COOKIE)?.value ?? "";
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sign(payload));
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as StaffSession & { exp: number };
    if (s.exp <= Date.now()) return null;
    if (s.id === "bootstrap") return { id: s.id, name: s.name, role: "super_admin" };
    const u = await db.staffUser.findUnique({ where: { id: s.id } });
    if (!u || !u.active) return null;
    return { id: u.id, name: u.name, role: u.role as Role };
  } catch {
    return null;
  }
}

/** Name of the signed-in staff member (for older callers). */
export async function currentStaff(): Promise<string | null> {
  return (await currentSession())?.name ?? null;
}

/** Use at the top of every admin page and server action. Returns the staff name for the audit log. */
export async function requireStaff(perm: Permission = "dashboard"): Promise<string> {
  return (await requireRole(perm)).name;
}

export async function requireRole(perm: Permission): Promise<StaffSession> {
  await ensureCatalog();
  const s = await currentSession();
  if (!s) redirect("/admin/login");
  if (!can(s.role, perm)) redirect("/admin?denied=" + perm);
  return s;
}
