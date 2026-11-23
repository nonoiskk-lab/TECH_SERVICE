import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const url = process.env.TEST_DATABASE_URL ?? "postgresql://thirdspace:thirdspace@localhost:5432/thirdspace_test";
const prisma = new PrismaClient({ datasources: { db: { url } } });
const TAG = "vitest-credits";
let membershipId = "";
let customerId = "";

const bal = async () => (await prisma.creditEntry.aggregate({ where: { membershipId }, _sum: { minutes: true } }))._sum.minutes ?? 0;
const post = (kind: string, minutes: number, extra: Record<string, unknown> = {}) =>
  prisma.creditEntry.create({ data: { membershipId, kind, minutes, actor: TAG, ...extra } as never });

async function clean() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "CreditEntry" DISABLE TRIGGER credit_entry_immutable`);
  await prisma.creditEntry.deleteMany({ where: { actor: TAG } });
  await prisma.$executeRawUnsafe(`ALTER TABLE "CreditEntry" ENABLE TRIGGER credit_entry_immutable`);
  await prisma.creatorMembership.deleteMany({ where: { packageId: TAG } });
  await prisma.customer.deleteMany({ where: { name: TAG } });
}

beforeAll(async () => {
  await clean();
  const c = await prisma.customer.create({ data: { name: TAG, phone: "9000000001", email: `${TAG}@example.com` } as never });
  customerId = c.id;
  const m = await prisma.creatorMembership.create({
    data: { customerId, packageId: TAG, bookingId: `${TAG}-b`, hoursTotal: 8, validUntil: new Date("2031-01-01") },
  });
  membershipId = m.id;
  await post("purchase", 480, { key: `${TAG}:purchase` });
});
afterAll(async () => { await clean(); await prisma.$disconnect(); });

describe("credit ledger (database guarantees)", () => {
  it("balance is the sum of entries", async () => {
    expect(await bal()).toBe(480);
    await post("consume", -120);
    expect(await bal()).toBe(360);
  });

  it("rejects a consume that would make the balance negative", async () => {
    await expect(post("consume", -361)).rejects.toThrow(/insufficient_credits|check/i);
    expect(await bal()).toBe(360);
  });

  it("is idempotent per key (unique)", async () => {
    await post("restore", 120, { key: `${TAG}:r1` });
    await expect(post("restore", 120, { key: `${TAG}:r1` })).rejects.toThrow();
    expect(await bal()).toBe(480);
  });

  it("is append-only: update and delete are rejected", async () => {
    const e = await prisma.creditEntry.findFirstOrThrow({ where: { membershipId } });
    await expect(prisma.creditEntry.update({ where: { id: e.id }, data: { minutes: 1 } })).rejects.toThrow(/append-only/i);
    await expect(prisma.creditEntry.delete({ where: { id: e.id } })).rejects.toThrow(/append-only/i);
  });

  it("rejects wrong-sign entries for a kind", async () => {
    await expect(post("consume", 30)).rejects.toThrow();
    await expect(post("purchase", -30)).rejects.toThrow();
    await expect(post("adjust", 0)).rejects.toThrow();
  });

  it("20 parallel consumes of 60 min against 480 left: exactly 8 succeed, balance 0, never negative", async () => {
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => post("consume", -60)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(8);
    expect(await bal()).toBe(0);
  });
});
