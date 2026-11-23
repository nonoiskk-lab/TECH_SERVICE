import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { GatewayPayment, PaymentService } from "@/server/slots/types";

/**
 * Payment adapters. With RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET set, real
 * Razorpay orders are created and the checkout signature is verified.
 * Without them, the mock confirms every order it created (no money moves).
 */
const mockOrders = ((globalThis as unknown as { __tsMockOrders?: Set<string> }).__tsMockOrders ??= new Set<string>());

const mock: PaymentService = {
  provider: "mock",
  async createOrder(amount) {
    const orderId = "order_mock_" + randomBytes(6).toString("hex");
    mockOrders.add(orderId);
    return { orderId, amount, provider: "mock" };
  },
  async verify({ orderId }) {
    return { ok: mockOrders.delete(orderId), paymentId: "pay_mock_" + randomBytes(4).toString("hex") };
  },
  // Mock mode (development and tests only): no money moves, so a refund is "processed" immediately.
  async refund({ receipt }) {
    return { refundId: "rfnd_mock_" + receipt.replace(/[^a-z0-9]/gi, "").slice(0, 24), status: "processed" };
  },
  async listOrderPayments() {
    return [];
  },
};

function razorpay(keyId: string, secret: string): PaymentService {
  return {
    provider: "razorpay",
    async createOrder(amount, receipt) {
      const r = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Basic " + Buffer.from(`${keyId}:${secret}`).toString("base64") },
        body: JSON.stringify({ amount, currency: "INR", receipt }),
      });
      if (!r.ok) throw new Error(`RAZORPAY_ORDER_FAILED_${r.status}`);
      const j = (await r.json()) as { id: string };
      return { orderId: j.id, amount, provider: "razorpay", keyId };
    },
    async refund({ paymentId, amount, receipt }) {
      const r = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Basic " + Buffer.from(`${keyId}:${secret}`).toString("base64"),
          "X-Refund-Idempotency": receipt, // same receipt => Razorpay returns the same refund, never a second one
        },
        body: JSON.stringify({ amount, speed: "normal", receipt }),
      });
      if (!r.ok) throw new Error(`RAZORPAY_REFUND_FAILED_${r.status}`);
      const j = (await r.json()) as { id: string; status: string };
      return { refundId: j.id, status: j.status === "processed" ? "processed" : j.status === "failed" ? "failed" : "pending" };
    },
    async listOrderPayments(orderId) {
      const r = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}/payments`, {
        headers: { authorization: "Basic " + Buffer.from(`${keyId}:${secret}`).toString("base64") },
      });
      if (!r.ok) throw new Error(`RAZORPAY_LIST_FAILED_${r.status}`);
      const j = (await r.json()) as { items?: { id: string; status: string; amount: number; currency: string }[] };
      return (j.items ?? []).map((p) => ({ id: p.id, status: p.status as GatewayPayment["status"], amount: p.amount, currency: p.currency }));
    },
    async verify({ orderId, paymentId, signature }) {
      if (!paymentId || !signature) return { ok: false };
      const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      return { ok: a.length === b.length && timingSafeEqual(a, b), paymentId };
    },
  };
}

/**
 * "razorpay" when keys are set. Otherwise PAYMENTS_MODE decides: "mock"
 * (tests, local) or "venue" (live site without keys: no online payment, the
 * whole amount is paid at the venue). Production defaults to "venue" so a live
 * site never pretends to take money.
 */
export function paymentMode(): "razorpay" | "mock" | "venue" {
  const id = (process.env.RAZORPAY_KEY_ID ?? "").trim();
  const secret = (process.env.RAZORPAY_KEY_SECRET ?? "").trim();
  if (id && secret) return "razorpay";
  const m = (process.env.PAYMENTS_MODE ?? "").trim();
  if (m === "mock" || m === "venue") return m;
  return process.env.NODE_ENV === "production" ? "venue" : "mock";
}

export function onlinePaymentsEnabled() {
  return paymentMode() !== "venue";
}

export function paymentService(): PaymentService {
  const id = (process.env.RAZORPAY_KEY_ID ?? "").trim();
  const secret = (process.env.RAZORPAY_KEY_SECRET ?? "").trim();
  return paymentMode() === "razorpay" ? razorpay(id, secret) : mock;
}
