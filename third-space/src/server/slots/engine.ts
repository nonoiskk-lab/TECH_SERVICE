import { postCredit } from "@/server/credits";
import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { booking as bookingCfg, site } from "@/config/site";
import { getPackage } from "@/config/packages";
import { allowedDuration } from "@/lib/session";
import { declarationText, DECLARATION_VERSION, docsForService, POLICY_PACK_VERSION } from "@/config/policies";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { resourceRules, sharedAssetPeers } from "@/server/catalog";
import { addDays, istDateTime, istToday, toIstIso } from "./time";
import { HoldExpiredError, SlotTakenError, type AvailabilityService, type BookingDraft, type Hold, type HoldService, type Resource, type Slot } from "./types";

/**
 * Postgres slot engine.
 *
 * Two independent resources: "room" (Private Theatre: watch + celebrations)
 * and "studio" (Podcast & Creator Studio, free visit). Each has its own
 * hours, slot grid, buffer and booking window (Resource table). Holds,
 * bookings and closures occupy a resource; a buffer is kept after each one.
 * A package that needs a shared staff member or equipment item (PackageAsset)
 * is also blocked by bookings of other packages that need the same asset,
 * even in the other resource.
 *
 * Every write takes a per-resource advisory lock (and one per shared asset)
 * inside a transaction, so two guests can never get the same slot.
 */
export function resourceOf(packageId: string): Resource {
  const mode = getPackage(packageId)?.mode;
  return mode === "watch" || mode === "celebrate" ? "room" : "studio";
}

/** Statuses that occupy the calendar. pending_payment is covered by its hold. */
export const LIVE_STATUSES = ["confirmed", "checked_in", "in_progress", "completed"];

type Busy = { start: number; end: number; kind: "held" | "booked" | "blocked" };

async function busyIntervals(tx: Prisma.TransactionClient, packageId: string, from: Date, to: Date, now: Date): Promise<Busy[]> {
  const resource = resourceOf(packageId);
  const buffer = resourceRules(resource).bufferMinutes * 60_000;
  const lo = new Date(from.getTime() - 24 * 3600_000);
  const peers = sharedAssetPeers(packageId);
  const [hs, bs, blocks, peerBookings, peerHolds] = await Promise.all([
    tx.hold.findMany({ where: { resource, expiresAt: { gt: now }, start: { lt: to }, end: { gt: lo } } }),
    tx.booking.findMany({ where: { resource, status: { in: LIVE_STATUSES }, start: { lt: to }, end: { gt: lo } } }),
    tx.slotBlock.findMany({ where: { resource, start: { lt: to }, end: { gt: lo } } }),
    peers.length ? tx.booking.findMany({ where: { packageId: { in: peers }, status: { in: LIVE_STATUSES }, start: { lt: to }, end: { gt: lo } } }) : [],
    peers.length ? tx.hold.findMany({ where: { packageId: { in: peers }, expiresAt: { gt: now }, start: { lt: to }, end: { gt: lo } } }) : [],
  ]);
  return [
    ...hs.map((h) => ({ start: h.start.getTime(), end: h.end.getTime() + buffer, kind: "held" as const })),
    ...bs.map((b) => ({ start: b.start.getTime(), end: b.end.getTime() + buffer, kind: "booked" as const })),
    ...blocks.map((b) => ({ start: b.start.getTime(), end: b.end.getTime(), kind: "blocked" as const })),
    // Shared staff/equipment: exact overlap only (the other room keeps its own buffer).
    ...peerBookings.map((b) => ({ start: b.start.getTime(), end: b.end.getTime(), kind: "booked" as const })),
    ...peerHolds.map((h) => ({ start: h.start.getTime(), end: h.end.getTime(), kind: "held" as const })),
  ];
}

function statusAt(t: number, end: number, busy: Busy[], now: Date, bufferMs: number): Slot["status"] {
  if (t <= now.getTime()) return "past";
  const hit = busy.find((b) => t < b.end && b.start < end + bufferMs);
  return hit ? hit.kind : "available";
}

/** First and last bookable IST dates for a resource. */
export function bookingWindow(resource: Resource, now = new Date()) {
  const today = istToday(now);
  const first = site.launchAt.slice(0, 10);
  const minDate = today > first ? today : first;
  return { minDate, maxDate: addDays(minDate, resourceRules(resource).bookingWindowDays) };
}

async function slotsOn(tx: Prisma.TransactionClient, date: string, packageId: string, durationMinutes: number, now: Date, preloaded?: Busy[]): Promise<Slot[]> {
  const r = resourceRules(resourceOf(packageId));
  if (!r.active) return [];
  const { minDate, maxDate } = bookingWindow(resourceOf(packageId), now);
  if (date < minDate || date > maxDate) return [];
  const open = istDateTime(date, r.open);
  const close = istDateTime(date, r.close);
  const launch = Date.parse(site.launchAt);
  const busy = preloaded ?? (await busyIntervals(tx, packageId, open, close, now));
  const len = durationMinutes * 60_000;
  const buffer = r.bufferMinutes * 60_000;
  const slots: Slot[] = [];
  for (let t = open.getTime(); t + len <= close.getTime(); t += r.slotStepMinutes * 60_000) {
    if (t < launch) continue;
    slots.push({ start: toIstIso(new Date(t)), end: toIstIso(new Date(t + len)), status: statusAt(t, t + len, busy, now, buffer) });
  }
  return slots;
}

export const availability: AvailabilityService = {
  async slotsFor(date, packageId, durationMinutes, now = new Date()) {
    const pkg = getPackage(packageId);
    if (!pkg || !allowedDuration(pkg, durationMinutes)) return [];
    return slotsOn(db, date, packageId, durationMinutes, now);
  },
};

export type DayStatus = "available" | "full" | "unavailable";

/** Calendar view: one status per IST date of a month (YYYY-MM). */
export async function monthAvailability(month: string, packageId: string, durationMinutes: number, now = new Date()): Promise<Record<string, DayStatus>> {
  const pkg = getPackage(packageId);
  const out: Record<string, DayStatus> = {};
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  // One query set for the whole month, then each day is computed in memory.
  const busy = pkg ? await busyIntervals(db, packageId, istDateTime(`${month}-01`, "00:00"), istDateTime(addDays(`${month}-${String(days).padStart(2, "0")}`, 1), "00:00"), now) : [];
  for (let d = 1; d <= days; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    if (!pkg || !allowedDuration(pkg, durationMinutes)) {
      out[date] = "unavailable";
      continue;
    }
    const slots = await slotsOn(db, date, packageId, durationMinutes, now, busy);
    const future = slots.filter((s) => s.status !== "past");
    if (future.length === 0) out[date] = "unavailable";
    else out[date] = future.some((s) => s.status === "available") ? "available" : "full";
    // A day whose every slot is blocked (holiday/maintenance) reads as unavailable, not full.
    if (out[date] === "full" && future.every((s) => s.status === "blocked")) out[date] = "unavailable";
  }
  return out;
}

async function lock(tx: Prisma.TransactionClient, packageId: string) {
  const keys = [`ts:${resourceOf(packageId)}`, ...sharedAssetPeers(packageId).length ? ["ts:assets"] : []];
  for (const k of keys) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${k}))`;
}

function isOnGrid(start: Date, packageId: string) {
  const r = resourceRules(resourceOf(packageId));
  const iso = toIstIso(start);
  const minutes = Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
  const [oh, om] = r.open.split(":").map(Number);
  const [ch, cm] = r.close.split(":").map(Number);
  return { minutes, ok: (minutes - (oh * 60 + om)) % r.slotStepMinutes === 0, open: oh * 60 + om, close: ch * 60 + cm };
}

function toHold(h: { id: string; packageId: string; start: Date; end: Date; expiresAt: Date }): Hold {
  return {
    id: h.id,
    packageId: h.packageId,
    start: toIstIso(h.start),
    end: toIstIso(h.end),
    expiresAt: h.expiresAt.toISOString(),
    durationMinutes: (h.end.getTime() - h.start.getTime()) / 60_000,
  };
}

export const holds: HoldService = {
  async create(packageId, start, durationMinutes, now = new Date()) {
    const pkg = getPackage(packageId);
    const s = new Date(start);
    if (!pkg || Number.isNaN(s.getTime()) || !allowedDuration(pkg, durationMinutes)) throw new Error("BAD_REQUEST");
    const len = durationMinutes * 60_000;
    const grid = isOnGrid(s, packageId);
    if (!grid.ok || grid.minutes < grid.open || grid.minutes + durationMinutes > grid.close || s.getTime() < Date.parse(site.launchAt)) {
      throw new Error("BAD_REQUEST");
    }
    const resource = resourceOf(packageId);
    const buffer = resourceRules(resource).bufferMinutes * 60_000;
    return db.$transaction(async (tx) => {
      await lock(tx, packageId);
      const busy = await busyIntervals(tx, packageId, s, new Date(s.getTime() + len), now);
      if (statusAt(s.getTime(), s.getTime() + len, busy, now, buffer) !== "available") throw new SlotTakenError();
      const h = await tx.hold.create({
        data: { packageId, resource, start: s, end: new Date(s.getTime() + len), expiresAt: new Date(now.getTime() + bookingCfg.holdMinutes * 60_000) },
      });
      return toHold(h);
    });
  },
  async get(holdId, now = new Date()) {
    const h = await db.hold.findUnique({ where: { id: holdId } }).catch(() => null);
    if (!h || h.expiresAt <= now) return null;
    return toHold(h);
  },
  async release(holdId) {
    // A hold that belongs to a pending booking is released by the booking flow, not the guest's browser.
    const pending = await db.booking.findFirst({ where: { holdId, status: "pending_payment" } });
    if (!pending) await db.hold.deleteMany({ where: { id: holdId } });
  },
};

function bookingId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "TS-" + Array.from(randomBytes(6), (b) => alphabet[b % alphabet.length]).join("");
}

export type CreateOptions = {
  /** confirmed for pay-at-venue / free / admin; pending_payment while an online payment is open. */
  status: "confirmed" | "pending_payment";
  source?: "web" | "admin";
  actor?: string;
  couponCode?: string;
  /** Opening payment row (order created, or venue/manual record). */
  payment?: { provider: string; kind: "advance" | "full" | "balance"; orderId?: string; amount: number; status: "created" | "captured" | "pending" };
  /** Runs inside the booking transaction; if it throws, the whole booking is rolled back (used to spend plan hours atomically). */
  inTransaction?: (tx: Prisma.TransactionClient, booking: { id: string; start: Date; durationMinutes: number }) => Promise<void>;
};

/**
 * Turns a live hold into a booking (with its policy acceptance record and
 * customer) in one transaction. Fails if the hold expired or no longer
 * matches the requested session. A coupon's use is counted atomically.
 */
export async function createBooking(draft: BookingDraft, holdId: string, opts: CreateOptions) {
  const pkg = getPackage(draft.packageId)!;
  const docs = docsForService(pkg.service);
  return db.$transaction(async (tx) => {
    const hold = await tx.hold.findUnique({ where: { id: holdId } });
    if (!hold || hold.expiresAt <= new Date() || hold.packageId !== draft.packageId) throw new HoldExpiredError();
    if (hold.end.getTime() - hold.start.getTime() !== draft.durationMinutes * 60_000) throw new HoldExpiredError();
    await lock(tx, draft.packageId);
    if (opts.couponCode) {
      const used = await tx.coupon.updateMany({
        where: { code: opts.couponCode, active: true, OR: [{ maxUses: null }, { usedCount: { lt: tx.coupon.fields.maxUses } }] },
        data: { usedCount: { increment: 1 } },
      });
      if (used.count === 0) throw new Error("COUPON_EXHAUSTED");
    }
    const customer = await tx.customer.upsert({
      where: { phone: draft.guest.phone },
      create: { phone: draft.guest.phone, name: draft.guest.name, email: draft.guest.email, marketingConsent: draft.acceptance.marketingConsent },
      update: { name: draft.guest.name, email: draft.guest.email, ...(draft.acceptance.marketingConsent ? { marketingConsent: true } : {}) },
    });
    const b = await tx.booking.create({
      data: {
        id: bookingId(),
        accessToken: randomBytes(16).toString("hex"),
        customerId: customer.id,
        packageId: draft.packageId,
        packageName: pkg.name.en,
        service: pkg.service,
        mode: draft.mode,
        resource: hold.resource,
        start: hold.start,
        end: hold.end,
        addOnIds: draft.addOnIds,
        themeId: draft.themeId,
        titleId: draft.titleId,
        titleName: draft.titleName,
        sessionInput: draft.sessionInput,
        durationMinutes: draft.durationMinutes,
        guestName: draft.guest.name,
        guestPhone: draft.guest.phone,
        guestEmail: draft.guest.email,
        guestCount: draft.guestCount,
        locale: draft.locale,
        subtotal: draft.subtotal,
        discount: draft.discount,
        couponCode: opts.couponCode,
        tax: draft.tax,
        total: draft.total,
        // advancePaid counts money actually received; it starts at 0 until a payment is captured.
        advancePaid: opts.payment?.status === "captured" ? opts.payment.amount : 0,
        balanceDue: draft.total - (opts.payment?.status === "captured" ? opts.payment.amount : 0),
        specialRequests: draft.specialRequests,
        status: opts.status,
        source: opts.source ?? "web",
        holdId: opts.status === "pending_payment" ? hold.id : null,
        paymentProvider: opts.payment?.provider,
        paymentOrderId: opts.payment?.orderId,
        utm: draft.utm,
        acceptance: {
          create: {
            policyPackVersion: POLICY_PACK_VERSION,
            documents: docs,
            declarationVersion: DECLARATION_VERSION,
            declarationText: declarationText(),
            locale: draft.acceptance.locale,
            action: opts.source === "admin" ? "staff:manual-booking" : "checkbox:declaration",
            allParticipantsAdult: draft.acceptance.allParticipantsAdult,
            guestsInformed: draft.acceptance.guestsInformed,
            venueRulesAccepted: draft.acceptance.venueRulesAccepted,
            recordingConsent: draft.acceptance.recordingConsent,
            promotionalConsent: draft.acceptance.promotionalConsent,
            marketingConsent: draft.acceptance.marketingConsent,
          },
        },
        ...(opts.payment
          ? { payments: { create: { provider: opts.payment.provider, kind: opts.payment.kind, orderId: opts.payment.orderId, amount: opts.payment.amount, status: opts.payment.status } } }
          : {}),
      },
    });
    if (opts.status === "confirmed") await tx.hold.delete({ where: { id: hold.id } });
    else await tx.hold.update({ where: { id: hold.id }, data: { expiresAt: new Date(Math.max(hold.expiresAt.getTime(), Date.now() + 10 * 60_000)) } });
    if (opts.inTransaction) await opts.inTransaction(tx, { id: b.id, start: b.start, durationMinutes: b.durationMinutes });
    if (pkg.prepaidHours && opts.status === "confirmed") await createMembership(tx, b.id, customer.id, pkg.id, pkg.prepaidHours, pkg.prepaidValidityDays ?? 30, b.start);
    await audit(tx, opts.actor ?? "guest", opts.status === "confirmed" ? "booking.created" : "booking.pending_payment", "Booking", b.id, {
      packageId: b.packageId,
      start: b.start,
      total: b.total,
      couponCode: opts.couponCode,
      source: opts.source ?? "web",
      policyPackVersion: POLICY_PACK_VERSION,
    });
    return b;
  });
}

async function createMembership(tx: Prisma.TransactionClient, bookingId: string, customerId: string, packageId: string, hoursTotal: number, validityDays: number, start: Date) {
  const m = await tx.creatorMembership.upsert({
    where: { bookingId },
    create: { bookingId, customerId, packageId, hoursTotal, validUntil: new Date(start.getTime() + validityDays * 86400_000) },
    update: {},
  });
  // Ledger: the plan's hours, then the first session booked with the plan. Keys make both idempotent
  // (a retried payment confirmation cannot grant the hours twice).
  await postCredit(tx, { membershipId: m.id, kind: "purchase", minutes: hoursTotal * 60, bookingId, note: "Plan purchased", actor: "system", key: `purchase:${bookingId}` });
  await postCredit(tx, { membershipId: m.id, kind: "consume", minutes: -120, bookingId, note: "First session booked with the plan", actor: "system", key: `consume:${bookingId}:first` });
}

export type ConfirmResult =
  | { state: "confirmed"; bookingId: string; token: string; fresh: boolean }
  | { state: "refund_pending"; bookingId: string; token: string; fresh: boolean }
  | { state: "unknown_order" }
  /** The gateway says it captured a different amount or currency than we ordered: nothing is confirmed. */
  | { state: "amount_mismatch"; bookingId: string };

/**
 * Mark an online payment as captured and confirm its booking. Called by the
 * browser callback and by the Razorpay webhook; whichever comes first wins,
 * the second is a no-op (idempotent on the payment row).
 */
export async function confirmPayment(orderId: string, paymentId: string | undefined, actor: string, gateway?: { amount: number; currency?: string }): Promise<ConfirmResult> {
  return db.$transaction(async (tx) => {
    const probe = await tx.payment.findUnique({ where: { orderId }, select: { id: true } });
    if (!probe) return { state: "unknown_order" as const };
    // Serialise every confirmation of this payment. The browser callback, the webhook and the
    // reconciliation job can arrive at the same instant; without this row lock each would see
    // "not captured yet" and the advance would be added more than once.
    await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id" = ${probe.id} FOR UPDATE`;
    const pay = await tx.payment.findUniqueOrThrow({ where: { id: probe.id }, include: { booking: true } });
    const b = pay.booking;
    if (gateway && pay.status !== "captured" && (gateway.amount !== pay.amount || (gateway.currency && gateway.currency !== "INR"))) {
      await audit(tx, actor, "payment.amount_mismatch", "Booking", b.id, { orderId, paymentId, expected: pay.amount, got: gateway.amount, currency: gateway.currency });
      return { state: "amount_mismatch" as const, bookingId: b.id };
    }
    if (pay.status === "captured") {
      return { state: b.status === "refund_pending" ? ("refund_pending" as const) : ("confirmed" as const), bookingId: b.id, token: b.accessToken, fresh: false };
    }
    await lock(tx, b.packageId);
    const hold = b.holdId ? await tx.hold.findUnique({ where: { id: b.holdId } }) : null;
    let ok = !!hold && hold.expiresAt > new Date();
    if (!ok) {
      // Hold ran out while the guest was paying: confirm only if the time is still free.
      const busy = await busyIntervals(tx, b.packageId, b.start, b.end, new Date());
      const buffer = resourceRules(b.resource).bufferMinutes * 60_000;
      ok = statusAt(b.start.getTime(), b.end.getTime(), busy, new Date(0), buffer) === "available";
    }
    await tx.payment.update({ where: { id: pay.id }, data: { status: "captured", paymentId: paymentId ?? null } });
    const updated = await tx.booking.update({
      where: { id: b.id },
      data: {
        status: ok ? "confirmed" : "refund_pending",
        advancePaid: { increment: pay.amount },
        balanceDue: { decrement: pay.amount },
        paymentId,
        holdId: null,
      },
    });
    if (hold) await tx.hold.delete({ where: { id: hold.id } });
    const pkg = getPackage(b.packageId);
    if (ok && pkg?.prepaidHours && b.customerId) await createMembership(tx, b.id, b.customerId, b.packageId, pkg.prepaidHours, pkg.prepaidValidityDays ?? 30, b.start);
    await audit(tx, actor, ok ? "payment.captured" : "payment.captured_after_hold_expired", "Booking", b.id, { orderId, paymentId, amount: pay.amount });
    return { state: ok ? ("confirmed" as const) : ("refund_pending" as const), bookingId: updated.id, token: updated.accessToken, fresh: true };
  });
}

export async function getBookingForGuest(id: string, token: string) {
  const b = await db.booking.findUnique({ where: { id }, include: { acceptance: true, payments: true, recordings: true } });
  if (!b || !token || b.accessToken !== token) return null;
  return b;
}
