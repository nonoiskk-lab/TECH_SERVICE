import { randomBytes, randomUUID } from "node:crypto";
import { booking as bookingCfg, hours, site } from "@/config/site";
import { getPackage } from "@/config/packages";
import { istDateTime, toIstIso } from "./time";
import {
  HoldExpiredError,
  SlotTakenError,
  type AvailabilityService,
  type Booking,
  type BookingService,
  type Hold,
  type HoldService,
  type Lead,
  type LeadService,
  type OtpService,
  type PaymentOrder,
  type PaymentService,
  type Slot,
} from "./types";

/**
 * IN-MEMORY MOCK ADAPTERS. Data lives in this Node process only and is lost on
 * restart. One room and one studio are modelled as two resources: "room"
 * (watch/celebrate) and "studio" (create). The free tour uses the studio.
 */
type Store = {
  holds: Map<string, Hold>;
  bookings: Map<string, Booking>;
  orders: Map<string, PaymentOrder>;
  leads: Lead[];
  otps: Map<string, string>;
};

const g = globalThis as unknown as { __thirdSpaceStore?: Store };
const store: Store = (g.__thirdSpaceStore ??= {
  holds: new Map(),
  bookings: new Map(),
  orders: new Map(),
  leads: [],
  otps: new Map(),
});

function resourceOf(packageId: string): "room" | "studio" {
  const p = getPackage(packageId);
  return p && p.mode === "watch" ? "room" : "studio";
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

function busyIntervals(resource: "room" | "studio", now: Date, excludeHold?: string) {
  const buffer = hours.bufferMinutes * 60_000;
  const out: { start: number; end: number; kind: "held" | "booked" }[] = [];
  for (const h of store.holds.values()) {
    if (h.id === excludeHold) continue;
    if (new Date(h.expiresAt) <= now) continue;
    if (resourceOf(h.packageId) !== resource) continue;
    out.push({ start: Date.parse(h.start), end: Date.parse(h.end) + buffer, kind: "held" });
  }
  for (const b of store.bookings.values()) {
    if (resourceOf(b.packageId) !== resource) continue;
    out.push({ start: Date.parse(b.start), end: Date.parse(b.end) + buffer, kind: "booked" });
  }
  return out;
}

function endFor(packageId: string, start: Date) {
  const p = getPackage(packageId)!;
  return new Date(start.getTime() + p.durationMinutes * 60_000);
}

export const mockAvailability: AvailabilityService = {
  async slotsFor(date, packageId, now = new Date()) {
    const pkg = getPackage(packageId);
    if (!pkg) return [];
    const open = istDateTime(date, hours.open).getTime();
    const close = istDateTime(date, hours.close).getTime();
    const launch = Date.parse(site.launchAt);
    const busy = busyIntervals(resourceOf(packageId), now);
    const slots: Slot[] = [];
    for (let t = open; t + pkg.durationMinutes * 60_000 <= close; t += hours.slotStepMinutes * 60_000) {
      if (t < launch) continue;
      const end = t + pkg.durationMinutes * 60_000;
      let status: Slot["status"] = "available";
      if (t <= now.getTime()) status = "past";
      else {
        const hit = busy.find((b) => overlaps(t, end + hours.bufferMinutes * 60_000, b.start, b.end));
        if (hit) status = hit.kind;
      }
      slots.push({ start: toIstIso(new Date(t)), end: toIstIso(new Date(end)), status });
    }
    return slots;
  },
};

export const mockHolds: HoldService = {
  async create(packageId, start, now = new Date()) {
    const pkg = getPackage(packageId);
    const s = new Date(start);
    if (!pkg || Number.isNaN(s.getTime())) throw new Error("BAD_REQUEST");
    const slots = await mockAvailability.slotsFor(start.slice(0, 10), packageId, now);
    const slot = slots.find((x) => Date.parse(x.start) === s.getTime());
    if (!slot || slot.status !== "available") throw new SlotTakenError();
    const e = endFor(packageId, s);
    const hold: Hold = {
      id: randomUUID(),
      packageId,
      start: toIstIso(s),
      end: toIstIso(e),
      expiresAt: new Date(now.getTime() + bookingCfg.holdMinutes * 60_000).toISOString(),
    };
    store.holds.set(hold.id, hold);
    return hold;
  },
  async get(holdId, now = new Date()) {
    const h = store.holds.get(holdId);
    if (!h) return null;
    if (new Date(h.expiresAt) <= now) {
      store.holds.delete(holdId);
      return null;
    }
    return h;
  },
  async release(holdId) {
    store.holds.delete(holdId);
  },
};

export const mockPayments: PaymentService = {
  provider: "mock-razorpay",
  async createOrder(holdId, amount) {
    const order: PaymentOrder = { orderId: "order_" + randomBytes(6).toString("hex"), holdId, amount, provider: this.provider };
    store.orders.set(order.orderId, order);
    return order;
  },
  async confirm(orderId) {
    return { ok: store.orders.has(orderId) };
  },
};

function bookingId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return "TS-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export const mockBookings: BookingService = {
  async create(input, holdId) {
    const hold = await mockHolds.get(holdId);
    if (!hold) throw new HoldExpiredError();
    const b: Booking = { ...input, start: hold.start, end: hold.end, id: bookingId(), createdAt: new Date().toISOString() };
    store.bookings.set(b.id, b);
    store.holds.delete(holdId);
    return b;
  },
  async get(id) {
    return store.bookings.get(id) ?? null;
  },
};

export const mockLeads: LeadService = {
  async create(input) {
    const lead: Lead = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    store.leads.push(lead);
    return lead;
  },
};

/** OTP stub: any phone receives the fixed code below. Shown on screen in mock mode. */
export const MOCK_OTP_CODE = "123456";
export const mockOtp: OtpService = {
  isMock: true,
  async send(phone) {
    store.otps.set(phone, MOCK_OTP_CODE);
  },
  async verify(phone, code) {
    return store.otps.get(phone) === code;
  },
};
