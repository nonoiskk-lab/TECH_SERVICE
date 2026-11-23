import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://thirdspace:thirdspace@localhost:5432/thirdspace_test";
delete process.env.RATE_LIMIT_DISABLED;
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
afterAll(async () => { await prisma.rateLimit.deleteMany({ where: { key: { startsWith: "vitest:" } } }); await prisma.$disconnect(); });

describe("rate limiter (Postgres-backed)", () => {
  it("allows up to the limit then refuses", async () => {
    const { rateLimit } = await import("@/server/rate-limit");
    const key = `vitest:${Date.now()}:a`;
    const results = [];
    for (let i = 0; i < 7; i++) results.push(await rateLimit(key, 5, 3600));
    expect(results).toEqual([true, true, true, true, true, false, false]);
  });
  it("keeps separate keys separate", async () => {
    const { rateLimit } = await import("@/server/rate-limit");
    const a = `vitest:${Date.now()}:b1`;
    for (let i = 0; i < 3; i++) await rateLimit(a, 2, 3600);
    expect(await rateLimit(a, 2, 3600)).toBe(false);
    expect(await rateLimit(`vitest:${Date.now()}:b2`, 2, 3600)).toBe(true);
  });
  it("holds under parallel callers: exactly `limit` pass", async () => {
    const { rateLimit } = await import("@/server/rate-limit");
    const key = `vitest:${Date.now()}:c`;
    const res = await Promise.all(Array.from({ length: 20 }, () => rateLimit(key, 5, 3600)));
    expect(res.filter(Boolean).length).toBe(5);
  });
});
