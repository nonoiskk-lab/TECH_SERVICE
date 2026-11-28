import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const url = process.env.TEST_DATABASE_URL ?? "postgresql://thirdspace:thirdspace@localhost:5432/thirdspace_test";
const prisma = new PrismaClient({ datasources: { db: { url } } });
const TAG = "vitest-overlap";
const resource = "vitest-room";

function base(id: string, start: Date, end: Date, status = "confirmed") {
  return {
    id, accessToken: id, packageId: "p", packageName: "p", service: "s", mode: "m", resource,
    start, end, guestName: TAG, guestPhone: "0", guestEmail: "t@example.com", guestCount: 1, locale: "en",
    total: 0, subtotal: 0, discount: 0, tax: 0, advancePaid: 0, balanceDue: 0, status, durationMinutes: 60,
    source: "test", specialRequests: "",
  };
}
const at = (h: number) => new Date(Date.UTC(2030, 0, 1, h, 0, 0));

beforeAll(async () => { await prisma.booking.deleteMany({ where: { guestName: TAG } }); });
afterAll(async () => { await prisma.booking.deleteMany({ where: { guestName: TAG } }); await prisma.$disconnect(); });

describe("database-level overlap guard (booking_no_overlap)", () => {
  it("rejects an overlapping live booking written by direct insert", async () => {
    await prisma.booking.create({ data: base("vo-a", at(10), at(12)) });
    await expect(prisma.booking.create({ data: base("vo-b", at(11), at(13)) })).rejects.toThrow(/booking_no_overlap|exclusion/i);
  });

  it("allows back-to-back bookings (end == next start)", async () => {
    await prisma.booking.create({ data: base("vo-c", at(12), at(14)) });
    expect(await prisma.booking.count({ where: { id: "vo-c" } })).toBe(1);
  });

  it("ignores non-live statuses (pending_payment, cancelled)", async () => {
    await prisma.booking.create({ data: base("vo-d", at(10), at(12), "pending_payment") });
    await prisma.booking.create({ data: base("vo-e", at(10), at(12), "cancelled") });
    expect(await prisma.booking.count({ where: { id: { in: ["vo-d", "vo-e"] } } })).toBe(2);
  });

  it("does not let a pending booking become live on top of a live one", async () => {
    await expect(prisma.booking.update({ where: { id: "vo-d" }, data: { status: "confirmed" } })).rejects.toThrow(/booking_no_overlap|exclusion/i);
  });

  it("50 parallel inserts for one slot: exactly one succeeds", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 50 }, (_, i) => prisma.booking.create({ data: base(`vo-p${i}`, at(16), at(18)) })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(49);
  });
});
