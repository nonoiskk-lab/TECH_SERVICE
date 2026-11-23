import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://thirdspace:thirdspace@localhost:5432/thirdspace_test";

// A controllable gateway: tests decide what Razorpay "says".
const gateway = {
  provider: "razorpay",
  payments: {} as Record<string, { id: string; status: string; amount: number; currency: string }[]>,
  refundCalls: [] as { paymentId: string; amount: number; receipt: string }[],
  refundStatus: "pending" as "pending" | "processed" | "failed",
  failRefund: false,
  async createOrder() { throw new Error("unused"); },
  async verify() { return { ok: false }; },
  async listOrderPayments(orderId: string) { return this.payments[orderId] ?? []; },
  async refund(i: { paymentId: string; amount: number; receipt: string }) {
    this.refundCalls.push(i);
    if (this.failRefund) throw new Error("gateway down");
    return { refundId: `rfnd_${i.receipt}`, status: this.refundStatus };
  },
};
vi.mock("@/server/payments", () => ({ paymentService: () => gateway, onlinePaymentsEnabled: () => true, paymentMode: () => "razorpay" }));
vi.mock("@/server/notify", () => ({ notifyBooking: async () => {} }));

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const TAG = "vitest-pay";
const day = (n: number) => new Date(Date.UTC(2031, 5, n, 10, 0, 0));
let seq = 0;

async function pending(amount = 200000) {
  const n = ++seq;
  const id = `${TAG}-${n}-${Date.now()}`;
  const hold = await prisma.hold.create({ data: { packageId: "podcast", resource: "studio", start: day(n), end: new Date(day(n).getTime() + 5400_000), expiresAt: new Date(Date.now() + 600_000) } });
  await prisma.booking.create({
    data: {
      id, accessToken: id, packageId: "podcast", packageName: "p", service: "podcast", mode: "create", resource: "studio",
      start: day(n), end: new Date(day(n).getTime() + 5400_000), guestName: TAG, guestPhone: "0", guestEmail: "t@example.com", guestCount: 1, locale: "en",
      total: amount, subtotal: amount, discount: 0, tax: 0, advancePaid: 0, balanceDue: amount, status: "pending_payment", durationMinutes: 90, source: "test", specialRequests: "", holdId: hold.id,
    },
  });
  await prisma.payment.create({ data: { bookingId: id, provider: "razorpay", kind: "advance", orderId: `order_${id}`, amount, status: "created" } });
  return { id, orderId: `order_${id}`, amount };
}

beforeAll(async () => { await cleanup(); });
afterAll(async () => { await cleanup(); await prisma.$disconnect(); });
beforeEach(() => { gateway.payments = {}; gateway.refundCalls = []; gateway.refundStatus = "pending"; gateway.failRefund = false; });
async function cleanup() {
  await prisma.payment.deleteMany({ where: { booking: { guestName: TAG } } });
  await prisma.auditLog.deleteMany({ where: { entityId: { startsWith: TAG } } });
  await prisma.booking.deleteMany({ where: { guestName: TAG } });
  await prisma.hold.deleteMany({ where: { packageId: "podcast", resource: "studio", start: { gte: day(1), lte: day(40) } } });
}

describe("confirmPayment: amount verification and idempotency", () => {
  it("does not confirm when the gateway amount differs from the order", async () => {
    const { confirmPayment } = await import("@/server/slots");
    const b = await pending(200000);
    const r = await confirmPayment(b.orderId, `pay_x_${b.id}`, "test", { amount: 100, currency: "INR" });
    expect(r.state).toBe("amount_mismatch");
    const row = await prisma.booking.findUniqueOrThrow({ where: { id: b.id } });
    expect(row.status).toBe("pending_payment");
    expect(row.advancePaid).toBe(0);
  });

  it("does not confirm a wrong currency", async () => {
    const { confirmPayment } = await import("@/server/slots");
    const b = await pending(200000);
    expect((await confirmPayment(b.orderId, `pay_x_${b.id}`, "test", { amount: 200000, currency: "USD" })).state).toBe("amount_mismatch");
  });

  it("confirms on the exact amount, once, however many times it is delivered (also in parallel)", async () => {
    const { confirmPayment } = await import("@/server/slots");
    const b = await pending(200000);
    const results = await Promise.all(Array.from({ length: 10 }, () => confirmPayment(b.orderId, `pay_ok_${b.id}`, "test", { amount: 200000, currency: "INR" })));
    expect(results.every((r) => r.state === "confirmed")).toBe(true);
    expect(results.filter((r) => r.state === "confirmed" && r.fresh)).toHaveLength(1);
    const row = await prisma.booking.findUniqueOrThrow({ where: { id: b.id } });
    expect(row.status).toBe("confirmed");
    expect(row.advancePaid).toBe(200000);
    expect(row.balanceDue).toBe(0);
  });
});

describe("reconciliation", () => {
  const old = () => new Date(Date.now() + 3600_000); // "now" an hour ahead so the order is older than 10 minutes

  it("recovers a captured payment whose webhook never arrived", async () => {
    const { reconcilePayments } = await import("@/server/reconcile");
    const b = await pending(200000);
    gateway.payments[b.orderId] = [{ id: `pay_rec_${b.id}`, status: "captured", amount: 200000, currency: "INR" }];
    const rep = await reconcilePayments({ now: old() });
    expect(rep.confirmed).toBeGreaterThanOrEqual(1);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("confirmed");
  });

  it("does not confirm an amount mismatch; marks all-failed orders failed; leaves open orders alone", async () => {
    const { reconcilePayments } = await import("@/server/reconcile");
    const mism = await pending(200000);
    gateway.payments[mism.orderId] = [{ id: "pay_m", status: "captured", amount: 5, currency: "INR" }];
    await reconcilePayments({ now: old() });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: mism.id } })).status).toBe("pending_payment");

    await prisma.payment.updateMany({ where: { bookingId: mism.id }, data: { status: "failed" } }); // take it out of the next scan
    const failed = await pending(200000);
    gateway.payments[failed.orderId] = [{ id: "pay_f", status: "failed", amount: 200000, currency: "INR" }];
    await reconcilePayments({ now: old() });
    expect((await prisma.payment.findFirstOrThrow({ where: { bookingId: failed.id } })).status).toBe("failed");
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: failed.id } })).status).toBe("pending_payment");
  });

  it("ignores orders younger than the minimum age", async () => {
    const { reconcilePayments } = await import("@/server/reconcile");
    const b = await pending(200000);
    gateway.payments[b.orderId] = [{ id: `pay_young_${b.id}`, status: "captured", amount: 200000, currency: "INR" }];
    await reconcilePayments({ now: new Date() });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("pending_payment");
  });
});

describe("gateway refunds", () => {
  async function refundPending(refundAmount: number) {
    const { confirmPayment } = await import("@/server/slots");
    const b = await pending(200000);
    await confirmPayment(b.orderId, `pay_${b.id}`, "test", { amount: 200000, currency: "INR" });
    await prisma.booking.update({ where: { id: b.id }, data: { status: "refund_pending", refundAmount } });
    return b;
  }

  it("requests the exact paise amount once; a second click does not refund again", async () => {
    const { issueGatewayRefund } = await import("@/server/refunds");
    const b = await refundPending(100001);
    const r1 = await issueGatewayRefund(b.id, "tester");
    expect(r1).toMatchObject({ ok: true, status: "pending", already: false });
    const r2 = await issueGatewayRefund(b.id, "tester");
    expect(r2).toMatchObject({ ok: true, already: true });
    expect(gateway.refundCalls).toHaveLength(1);
    expect(gateway.refundCalls[0]).toMatchObject({ amount: 100001, receipt: `refund-${b.id}` });
    // Still refund_pending until the gateway confirms.
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("refund_pending");
  });

  it("marks the booking refunded when the gateway reports processed", async () => {
    const { issueGatewayRefund } = await import("@/server/refunds");
    gateway.refundStatus = "processed";
    const b = await refundPending(200000);
    expect(await issueGatewayRefund(b.id, "tester")).toMatchObject({ ok: true, status: "processed" });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("refunded");
  });

  it("changes nothing when the gateway call fails, and can be retried", async () => {
    const { issueGatewayRefund } = await import("@/server/refunds");
    const b = await refundPending(200000);
    gateway.failRefund = true;
    expect((await issueGatewayRefund(b.id, "tester")).ok).toBe(false);
    expect(await prisma.payment.count({ where: { bookingId: b.id, kind: "refund" } })).toBe(0);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("refund_pending");
    gateway.failRefund = false;
    expect((await issueGatewayRefund(b.id, "tester")).ok).toBe(true);
  });

  it("refuses a refund larger than what was captured and bookings that are not refund_pending", async () => {
    const { issueGatewayRefund } = await import("@/server/refunds");
    const big = await refundPending(999999);
    expect((await issueGatewayRefund(big.id, "tester")).ok).toBe(false);
    const confirmed = await pending(200000);
    expect((await issueGatewayRefund(confirmed.id, "tester")).ok).toBe(false);
    expect(gateway.refundCalls).toHaveLength(0);
  });
});
