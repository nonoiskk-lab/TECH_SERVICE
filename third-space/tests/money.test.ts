import { describe, it, expect } from "vitest";
import { rs, parseRupees, paiseToInput, formatINR } from "@/lib/money";
import { buildQuote, couponDiscount, refundFor } from "@/lib/pricing";
import type { Package } from "@/config/site";
import type { Session } from "@/lib/session";

describe("money helpers (integer paise)", () => {
  it("rs() converts rupee literals to paise", () => {
    expect(rs(1699)).toBe(169900);
    expect(rs(0.5)).toBe(50);
  });
  it("parseRupees accepts admin input and rejects junk", () => {
    expect(parseRupees("1699")).toBe(169900);
    expect(parseRupees("1,699.50")).toBe(169950);
    expect(parseRupees("₹ 799")).toBe(79900);
    expect(parseRupees("0")).toBe(0);
    expect(parseRupees("-5")).toBeNull();
    expect(parseRupees("12.345")).toBeNull();
    expect(parseRupees("abc")).toBeNull();
    expect(parseRupees("")).toBeNull();
  });
  it("paiseToInput round-trips with parseRupees", () => {
    for (const p of [0, 1, 99, 100, 169900, 30582]) expect(parseRupees(paiseToInput(p))).toBe(p);
  });
  it("formatINR shows whole rupees cleanly and paise when present", () => {
    expect(formatINR(169900)).toBe("₹1,699");
    expect(formatINR(30582)).toBe("₹305.82");
    expect(formatINR(10000000)).toBe("₹1,00,000");
  });
});

const pkg = { id: "podcast", mode: "create" } as unknown as Package;
const session = (basePrice: number): Session =>
  ({ workMinutes: 90, setupMinutes: 30, durationMinutes: 120, basePrice, minimumApplied: false, startingPrice: basePrice, label: { en: "x", hi: "x" } }) as Session;

describe("quote in paise", () => {
  it("GST keeps paise precision; advance and balance add up exactly", () => {
    const q = buildQuote(pkg, [], "create", session(rs(1699)), 50, { addOns: [], taxPercent: 18 })!;
    expect(q.subtotal).toBe(169900);
    expect(q.tax).toBe(30582); // 18% of 1699.00 = 305.82
    expect(q.total).toBe(200482);
    expect(q.advance + q.balance).toBe(q.total);
    expect(Number.isInteger(q.advance)).toBe(true);
  });
  it("flat coupon value is in paise; percent coupon is a percent", () => {
    expect(couponDiscount({ code: "A", kind: "flat", value: rs(200), minSubtotal: 0, packageIds: [] }, rs(1699), "podcast")).toBe(20000);
    expect(couponDiscount({ code: "B", kind: "percent", value: 10, minSubtotal: 0, packageIds: [] }, rs(1699), "podcast")).toBe(16990);
    expect(couponDiscount({ code: "C", kind: "flat", value: rs(5000), minSubtotal: 0, packageIds: [] }, rs(1699), "podcast")).toBe(169900);
    expect(couponDiscount({ code: "D", kind: "flat", value: rs(100), minSubtotal: rs(2000), packageIds: [] }, rs(1699), "podcast")).toBe(0);
  });
  it("refund tiers return integer paise", () => {
    const r = refundFor(100001, 100);
    expect(Number.isInteger(r)).toBe(true);
    expect(r).toBeLessThanOrEqual(100001);
  });
});
