import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/server/db";

const COOKIE = "ts_guest";
const TTL_MS = 30 * 86400_000;

/** Customer accounts use the same server secret as staff, with their own key derivation. */
function key() {
  const s = (process.env.AUTH_SECRET ?? "").trim();
  if (s.length < 16) throw new Error("AUTH_SECRET is required for customer accounts");
  return createHmac("sha256", s).update("customer-session-v1").digest();
}
export function accountsEnabled() {
  return (process.env.AUTH_SECRET ?? "").trim().length >= 16;
}
const sign = (payload: string) => createHmac("sha256", key()).update(payload).digest("base64url");

export async function startCustomerSession(customerId: string) {
  const payload = Buffer.from(JSON.stringify({ id: customerId, exp: Date.now() + TTL_MS })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !(process.env.SITE_URL ?? "").startsWith("http://"),
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function endCustomerSession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in customer, or null. Accounts without a password (or anonymised) are never signed in. */
export async function currentCustomer() {
  if (!accountsEnabled()) return null;
  const raw = (await cookies()).get(COOKIE)?.value ?? "";
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sign(payload));
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as { id: string; exp: number };
    if (s.exp <= Date.now()) return null;
    const c = await db.customer.findUnique({ where: { id: s.id } });
    return c && c.passwordHash && !c.deletionRequested ? c : null;
  } catch {
    return null;
  }
}
