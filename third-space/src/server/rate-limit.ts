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
  // One atomic statement: two simultaneous first hits cannot both read "no row".
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count") VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" = EXCLUDED."windowStart" THEN "RateLimit"."count" + 1 ELSE 1 END,
      "windowStart" = EXCLUDED."windowStart"
    RETURNING "count"`;
  const count = Number(rows[0]?.count ?? 1);
  return count <= limit;
}
