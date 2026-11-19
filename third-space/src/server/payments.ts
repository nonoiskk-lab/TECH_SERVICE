import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PaymentService } from "@/server/slots/types";

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
};

function razorpay(keyId: string, secret: string): PaymentService {
  return {
    provider: "razorpay",
    async createOrder(amount, receipt) {
      const r = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Basic " + Buffer.from(`${keyId}:${secret}`).toString("base64") },
        body: JSON.stringify({ amount: amount * 100, currency: "INR", receipt }),
      });
      if (!r.ok) throw new Error(`RAZORPAY_ORDER_FAILED_${r.status}`);
      const j = (await r.json()) as { id: string };
      return { orderId: j.id, amount, provider: "razorpay", keyId };
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

export function paymentService(): PaymentService {
  const id = (process.env.RAZORPAY_KEY_ID ?? "").trim();
  const secret = (process.env.RAZORPAY_KEY_SECRET ?? "").trim();
  return id && secret ? razorpay(id, secret) : mock;
}
