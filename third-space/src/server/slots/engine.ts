import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { booking as bookingCfg, hours, site } from "@/config/site";
import { getPackage } from "@/config/packages";
import { allowedDuration } from "@/lib/session";
import { declarationText, DECLARATION_VERSION, docsForService, POLICY_PACK_VERSION } from "@/config/policies";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { istDateTime, toIstIso } from "./time";
import { HoldExpiredError, SlotTakenError, type AvailabilityService, type BookingDraft, type Hold, type HoldService, type Resource, type Slot } from "./types";

/**
 * Postgres slot engine. One "room" (Watch/Celebrate) and one "studio"
 * (Podcast, Creator Studio, free visit). Holds, bookings and staff blocks all
 * occupy a resource; a buffer is kept after each one. Writes take a
 * per-resource advisory lock so two guests can never get the same slot.
 */
export function resourceOf(packageId: string): Resource {
  const mode = getPackage(packageId)?.mode;
  return mode === "watch" || mode === "celebrate" ? "room" : "studio";
}

const LIVE_STATUSES = ["confirmed", "checked_in", "completed"];
const BUFFER_MS = () => hours.bufferMinutes * 60_000;

type Busy = { start: number; end: number; kind: "held" | "booked" | "blocked" };

async function busyIntervals(tx: Prisma.TransactionClient, resource: Resource, from: Date, to: Date, now: Date): Promise<Busy[]> {
  const buffer = BUFFER_MS();
  const lo = new Date(from.getTime() - 24 * 3600_000);
  const [hs, bs, blocks] = await Promise.all([
    tx.hold.findMany({ where: { resource, expiresAt: { gt: now }, start: { lt: to }, end: { gt: lo } } }),
    tx.booking.findMany({ where: { resource, status: { in: LIVE_STATUSES }, start: { lt: to }, end: { gt: lo } } }),
    tx.slotBlock.findMany({ where: { resource, start: { lt: to }, end: { gt: lo } } }),
  ]);
  return [
    ...hs.map((h) => ({ start: h.start.getTime(), end: h.end.getTime() + buffer, kind: "held" as const })),
    ...bs.map((b) => ({ start: b.start.getTime(), end: b.end.getTime() + buffer, kind: "booked" as const })),
    ...blocks.map((b) => ({ start: b.start.getTime(), end: b.end.getTime(), kind: "blocked" as const })),
  ];
}

function statusAt(t: number, end: number, busy: Busy[], now: Date): Slot["status"] {
  if (t <= now.getTime()) return "past";
  const hit = busy.find((b) => t < b.end && b.start < end + BUFFER_MS());
  return hit ? hit.kind : "available";
}

export const availability: AvailabilityService = {
  async slotsFor(date, packageId, durationMinutes, now = new Date()) {
    const pkg = getPackage(packageId);
    if (!pkg || !allowedDuration(pkg, durationMinutes)) return [];
    const open = istDateTime(date, hours.open);
    const close = istDateTime(date, hours.close);
    const launch = Date.parse(site.launchAt);
    const busy = await busyIntervals(db, resourceOf(packageId), open, close, now);
    const slots: Slot[] = [];
    const len = durationMinutes * 60_000;
    for (let t = open.getTime(); t + len <= close.getTime(); t += hours.slotStepMinutes * 60_000) {
      if (t < launch) continue;
      slots.push({ start: toIstIso(new Date(t)), end: toIstIso(new Date(t + len)), status: statusAt(t, t + len, busy, now) });
    }
    return slots;
  },
};

async function lockResource(tx: Prisma.TransactionClient, resource: Resource) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"ts:" + resource}))`;
}

function isOnGrid(start: Date) {
  const iso = toIstIso(start);
  const minutes = Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
  const [oh, om] = hours.open.split(":").map(Number);
  const [ch, cm] = hours.close.split(":").map(Number);
  return { minutes, ok: (minutes - (oh * 60 + om)) % hours.slotStepMinutes === 0, open: oh * 60 + om, close: ch * 60 + cm };
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
    const grid = isOnGrid(s);
    if (!grid.ok || grid.minutes < grid.open || grid.minutes + durationMinutes > grid.close || s.getTime() < Date.parse(site.launchAt)) {
      throw new Error("BAD_REQUEST");
    }
    const resource = resourceOf(packageId);
    return db.$transaction(async (tx) => {
      await lockResource(tx, resource);
      const busy = await busyIntervals(tx, resource, s, new Date(s.getTime() + len), now);
      if (statusAt(s.getTime(), s.getTime() + len, busy, now) !== "available") throw new SlotTakenError();
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
    await db.hold.deleteMany({ where: { id: holdId } });
  },
};

function bookingId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "TS-" + Array.from(randomBytes(6), (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Turns a live hold into a booking, together with its policy acceptance
 * record, in one transaction. Fails if the hold expired.
 */
export async function createBooking(draft: BookingDraft, holdId: string, payment: { provider?: string; orderId?: string; paymentId?: string }) {
  const pkg = getPackage(draft.packageId)!;
  const docs = docsForService(pkg.service);
  return db.$transaction(async (tx) => {
    const hold = await tx.hold.findUnique({ where: { id: holdId } });
    if (!hold || hold.expiresAt <= new Date() || hold.packageId !== draft.packageId) throw new HoldExpiredError();
    if (hold.end.getTime() - hold.start.getTime() !== draft.durationMinutes * 60_000) throw new HoldExpiredError();
    await lockResource(tx, hold.resource as Resource);
    const b = await tx.booking.create({
      data: {
        id: bookingId(),
        accessToken: randomBytes(16).toString("hex"),
        packageId: draft.packageId,
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
        total: draft.total,
        advancePaid: draft.advancePaid,
        balanceDue: draft.balanceDue,
        paymentProvider: payment.provider,
        paymentOrderId: payment.orderId,
        paymentId: payment.paymentId,
        utm: draft.utm,
        acceptance: {
          create: {
            policyPackVersion: POLICY_PACK_VERSION,
            documents: docs,
            declarationVersion: DECLARATION_VERSION,
            declarationText: declarationText(),
            locale: draft.acceptance.locale,
            action: "checkbox:declaration",
            allParticipantsAdult: draft.acceptance.allParticipantsAdult,
            guestsInformed: draft.acceptance.guestsInformed,
            venueRulesAccepted: draft.acceptance.venueRulesAccepted,
            recordingConsent: draft.acceptance.recordingConsent,
            promotionalConsent: draft.acceptance.promotionalConsent,
            marketingConsent: draft.acceptance.marketingConsent,
          },
        },
      },
    });
    await tx.hold.delete({ where: { id: hold.id } });
    await audit(tx, "guest", "booking.created", "Booking", b.id, { packageId: b.packageId, start: b.start, advancePaid: b.advancePaid, policyPackVersion: POLICY_PACK_VERSION });
    return b;
  });
}

export async function getBookingForGuest(id: string, token: string) {
  const b = await db.booking.findUnique({ where: { id }, include: { acceptance: true } });
  if (!b || !token || b.accessToken !== token) return null;
  return b;
}
