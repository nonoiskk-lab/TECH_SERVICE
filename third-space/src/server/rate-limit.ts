import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/server/db";

/** Client IP, hashed before storage (raw IPs are never kept). */
export async function clientKey(prefix: string) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  return `${prefix}:${createHash("sha256").update(ip).digest("hex").slice(0, 24)}`;
}

/**
 * Fixed-window rate limit stored in Postgres, so it holds across serverless
 * instances. Returns false when the caller is over the limit.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (process.env.RATE_LIMIT_DISABLED === "1") return true;
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000);
  const count = await db.$transaction(async (tx) => {
    const row = await tx.rateLimit.findUnique({ where: { key } });
    if (!row || row.windowStart.getTime() !== windowStart.getTime()) {
      await tx.rateLimit.upsert({ where: { key }, create: { key, windowStart, count: 1 }, update: { windowStart, count: 1 } });
      return 1;
    }
    return (await tx.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } })).count;
  });
  return count <= limit;
}
