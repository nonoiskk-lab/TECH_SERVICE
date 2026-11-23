"use server";

import { moveBooking } from "@/server/reschedule";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPackage } from "@/config/packages";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { invalidateCatalog } from "@/server/catalog";
import { createBooking, holds, SlotTakenError } from "@/server/slots";
import { notifyBooking } from "@/server/notify";
import { buildQuote, formatINR } from "@/lib/pricing";
import { parseRupees } from "@/lib/money";
import { resolveSession } from "@/lib/session";
import { hashPassword, requireRole, ROLES, type Permission } from "./auth";
import type { ActionState } from "./actions";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => {
  const v = str(f, k);
  return v === "" ? null : Number.isFinite(Number(v)) ? Math.round(Number(v)) : NaN;
};
/** Form field entered in rupees ("1699", "1,699.50") to integer paise. null = empty, NaN = invalid. */
const money = (f: FormData, k: string) => {
  const v = str(f, k);
  return v === "" ? null : (parseRupees(v) ?? NaN);
};
const bool = (f: FormData, k: string) => f.get(k) === "on";

async function guard(perm: Permission) {
  return (await requireRole(perm)).name;
}
function done(paths: string[], ok: string): ActionState {
  for (const p of paths) revalidatePath(p);
  return { ok };
}

// ---------------------------------------------------------------- packages

const PackageForm = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,40}$/),
  resourceId: z.enum(["room", "studio"]),
  category: z.enum(["theatre", "podcast", "celebration", "creator", "visit"]),
  pricingKind: z.enum(["fixed", "title", "podcast", "creator", "hourly"]),
  nameEn: z.string().min(2).max(80),
  nameHi: z.string().max(80),
  summaryEn: z.string().max(400),
  summaryHi: z.string().max(400),
  startingPrice: z.number().int().min(0).max(100_000_000),
  ratePerHour: z.number().int().min(0).max(10_000_000),
  durationMinutes: z.number().int().min(10).max(720),
  setupMinutes: z.number().int().min(0).max(120),
  maxGuests: z.number().int().min(1).max(100),
  advancePercent: z.number().int().min(0).max(100).nullable(),
  planHours: z.number().int().min(1).max(200).nullable(),
  planValidityDays: z.number().int().min(1).max(365).nullable(),
  sortOrder: z.number().int(),
});

export async function savePackageAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("packages");
  const parsed = PackageForm.safeParse({
    id: str(f, "id"),
    resourceId: str(f, "resourceId"),
    category: str(f, "category"),
    pricingKind: str(f, "pricingKind"),
    nameEn: str(f, "nameEn"),
    nameHi: str(f, "nameHi") || str(f, "nameEn"),
    summaryEn: str(f, "summaryEn"),
    summaryHi: str(f, "summaryHi"),
    startingPrice: money(f, "startingPrice"),
    ratePerHour: money(f, "ratePerHour") ?? 0,
    durationMinutes: int(f, "durationMinutes"),
    setupMinutes: int(f, "setupMinutes") ?? 0,
    maxGuests: int(f, "maxGuests"),
    advancePercent: int(f, "advancePercent"),
    planHours: int(f, "planHours"),
    planValidityDays: int(f, "planValidityDays"),
    sortOrder: int(f, "sortOrder") ?? 0,
  });
  if (!parsed.success) return { error: `Check: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}` };
  const d = parsed.data;
  const mode = d.category === "theatre" ? "watch" : d.category === "celebration" ? "celebrate" : d.category === "visit" ? "visit" : "create";
  const service = d.category === "theatre" ? "theatre" : d.category === "celebration" ? "celebration" : d.category === "visit" ? "visit" : d.pricingKind === "creator" ? "creator" : "podcast";
  const inclusions = str(f, "inclusions")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((l) => {
      const [en, hi] = l.split("|").map((x) => x.trim());
      return { en, hi: hi || en };
    });
  const data = {
    ...d,
    mode,
    service,
    inclusions,
    priceListLabelEn: str(f, "priceListLabelEn"),
    priceListLabelHi: str(f, "priceListLabelHi"),
    priceListNoteEn: str(f, "priceListNoteEn"),
    priceListNoteHi: str(f, "priceListNoteHi"),
    pricePlus: bool(f, "pricePlus"),
    showInPriceList: bool(f, "showInPriceList"),
    requiresLegalGate: bool(f, "requiresLegalGate"),
    active: bool(f, "active"),
  };
  const before = await db.package.findUnique({ where: { id: d.id } });
  await db.package.upsert({ where: { id: d.id }, create: data, update: data });
  invalidateCatalog();
  await audit(null, who, before ? "package.updated" : "package.created", "Package", d.id, {
    startingPrice: [before?.startingPrice, d.startingPrice],
    ratePerHour: [before?.ratePerHour, d.ratePerHour],
    active: data.active,
  });
  return done(["/admin/packages", "/"], `Saved ${d.nameEn}.`);
}

// ---------------------------------------------------------------- add-ons and coupons

export async function saveAddOnAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("packages");
  const id = str(f, "id");
  const price = money(f, "price");
  const modes = ["watch", "create", "celebrate"].filter((m) => bool(f, `mode_${m}`));
  if (!/^[a-z0-9-]{2,40}$/.test(id) || !str(f, "nameEn") || price === null || Number.isNaN(price) || price < 0) return { error: "Fill id (a-z, 0-9, -), name and price." };
  const data = { nameEn: str(f, "nameEn"), nameHi: str(f, "nameHi") || str(f, "nameEn"), price, modes, active: bool(f, "active"), sortOrder: int(f, "sortOrder") ?? 0 };
  await db.addOn.upsert({ where: { id }, create: { id, ...data }, update: data });
  invalidateCatalog();
  await audit(null, who, "addon.saved", "AddOn", id, { price, active: data.active });
  return done(["/admin/addons"], `Saved ${data.nameEn}.`);
}

export async function saveCouponAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("coupons");
  const code = str(f, "code").toUpperCase();
  const kind = str(f, "kind") === "flat" ? "flat" : "percent";
  const value = kind === "flat" ? money(f, "value") : int(f, "value");
  if (!/^[A-Z0-9-]{3,30}$/.test(code) || value === null || Number.isNaN(value) || value <= 0 || (kind === "percent" && value > 100)) return { error: "Code (A-Z, 0-9), and a value (percent ≤ 100 or rupees)." };
  const date = (k: string) => (str(f, k) ? new Date(`${str(f, k)}T00:00:00+05:30`) : null);
  const data = {
    kind,
    value,
    minSubtotal: money(f, "minSubtotal") ?? 0,
    maxUses: int(f, "maxUses"),
    packageIds: str(f, "packageIds").split(",").map((x) => x.trim()).filter(Boolean),
    validFrom: date("validFrom"),
    validUntil: date("validUntil"),
    active: bool(f, "active"),
  };
  await db.coupon.upsert({ where: { code }, create: { code, ...data }, update: data });
  await audit(null, who, "coupon.saved", "Coupon", code, { kind, value, active: data.active });
  return done(["/admin/coupons"], `Saved coupon ${code}.`);
}

// ---------------------------------------------------------------- calendar: resources and closures

export async function saveResourceAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("calendar");
  const id = str(f, "id");
  const t = (k: string) => (/^\d{2}:\d{2}$/.test(str(f, k)) ? str(f, k) : null);
  const open = t("openTime");
  const close = t("closeTime");
  const step = int(f, "slotStepMinutes");
  const buffer = int(f, "bufferMinutes");
  const window = int(f, "bookingWindowDays");
  if (!["room", "studio"].includes(id) || !open || !close || open >= close || !step || step < 10 || buffer === null || buffer < 0 || !window || window < 1) {
    return { error: "Check hours (open before close), slot step (≥10), buffer and window." };
  }
  await db.resource.update({ where: { id }, data: { openTime: open, closeTime: close, slotStepMinutes: step, bufferMinutes: buffer, bookingWindowDays: window, active: bool(f, "active") } });
  invalidateCatalog();
  await audit(null, who, "resource.updated", "Resource", id, { open, close, step, buffer, window });
  return done(["/admin/calendar"], "Saved.");
}

export async function createClosureAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("calendar");
  const resources = (str(f, "resource") === "both" ? ["room", "studio"] : [str(f, "resource")]).filter((r) => ["room", "studio"].includes(r));
  const kind = ["maintenance", "holiday", "event"].includes(str(f, "kind")) ? str(f, "kind") : "maintenance";
  const from = str(f, "fromDate");
  const to = str(f, "toDate") || from;
  const fromT = kind === "holiday" ? "00:00" : str(f, "fromTime") || "00:00";
  const toT = kind === "holiday" ? "23:59" : str(f, "toTime") || "23:59";
  const reason = str(f, "reason");
  if (!resources.length || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || reason.length < 3) return { error: "Fill space, dates and a reason." };
  const start = new Date(`${from}T${fromT}:00+05:30`);
  const end = new Date(`${to}T${toT}:00+05:30`);
  if (end <= start) return { error: "End must be after start." };
  let clashes = 0;
  for (const r of resources) {
    clashes += await db.booking.count({ where: { resource: r, status: { in: ["confirmed", "checked_in", "pending_payment"] }, start: { lt: end }, end: { gt: start } } });
    const blk = await db.slotBlock.create({ data: { resource: r, kind, start, end, reason, createdBy: who } });
    await audit(null, who, `slot.${kind}`, "SlotBlock", blk.id, { resource: r, start, end, reason });
  }
  return done(["/admin/calendar", "/admin/slots"], clashes ? `Saved. ${clashes} booking(s) overlap: contact those guests.` : "Saved.");
}

// ---------------------------------------------------------------- settings

export async function saveBusinessSettingsAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("settings");
  const n = (k: string, lo: number, hi: number) => {
    const v = int(f, k);
    return v !== null && !Number.isNaN(v) && v >= lo && v <= hi ? v : null;
  };
  const tax = n("taxPercent", 0, 28);
  const adv = n("advancePercent", 0, 100);
  const hold = n("holdMinutes", 5, 60);
  const minRaw = money(f, "minimumCharge");
  const min = minRaw !== null && !Number.isNaN(minRaw) && minRaw <= 10_000_000 ? minRaw : null;
  const tiers = [0, 1, 2].map((i) => ({ minHoursBefore: n(`tierHours${i}`, 0, 720), refundPercentOfAdvance: n(`tierPct${i}`, 0, 100) }));
  const rsHours = n("rescheduleMinHours", 0, 720);
  const rsTimes = n("rescheduleMaxTimes", 0, 10);
  if ([tax, adv, hold, min, rsHours, rsTimes].some((v) => v === null) || tiers.some((t) => t.minHoursBefore === null || t.refundPercentOfAdvance === null)) return { error: "Check the numbers." };
  const value = {
    taxPercent: tax,
    taxLabel: "GST",
    advancePercent: adv,
    holdMinutes: hold,
    minimumCharge: min,
    refundTiers: tiers,
    selfReschedule: bool(f, "selfReschedule"),
    rescheduleMinHours: rsHours,
    rescheduleMaxTimes: rsTimes,
  };
  await db.setting.upsert({ where: { key: "business" }, create: { key: "business", value, updatedBy: who }, update: { value, updatedBy: who } });
  invalidateCatalog();
  await audit(null, who, "settings.business", "Setting", "business", value);
  return done(["/admin/settings"], "Saved.");
}

export async function saveNotificationSettingsAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("notifications");
  const value = { reminder24h: bool(f, "reminder24h"), reminder2h: bool(f, "reminder2h"), feedbackAfterHours: int(f, "feedbackAfterHours") ?? 3 };
  await db.setting.upsert({ where: { key: "notifications" }, create: { key: "notifications", value, updatedBy: who }, update: { value, updatedBy: who } });
  await audit(null, who, "settings.notifications", "Setting", "notifications", value);
  return done(["/admin/notifications"], "Saved.");
}

// ---------------------------------------------------------------- staff

export async function saveStaffAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("staff");
  const email = str(f, "email").toLowerCase();
  const role = str(f, "role");
  const password = str(f, "password");
  if (!/.+@.+\..+/.test(email) || str(f, "name").length < 2 || !(ROLES as readonly string[]).includes(role)) return { error: "Name, email and role are required." };
  const existing = await db.staffUser.findUnique({ where: { email } });
  if (!existing && password.length < 10) return { error: "New staff need a password of 10+ characters." };
  if (password && password.length < 10) return { error: "Password must be 10+ characters." };
  const data = { name: str(f, "name"), role, active: bool(f, "active"), ...(password ? { passwordHash: await hashPassword(password) } : {}) };
  if (existing) await db.staffUser.update({ where: { email }, data });
  else await db.staffUser.create({ data: { email, ...data, passwordHash: data.passwordHash! } });
  await audit(null, who, existing ? "staff.updated" : "staff.created", "StaffUser", email, { role, active: data.active, passwordChanged: !!password });
  return done(["/admin/staff"], `Saved ${email}.`);
}

// ---------------------------------------------------------------- bookings: manual, reschedule, payments

export async function manualBookingAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("bookings.manage");
  const pkg = getPackage(str(f, "packageId"));
  if (!pkg) return { error: "Pick a package." };
  const date = str(f, "date");
  const time = str(f, "time");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "Pick date and start time." };
  const minutes = int(f, "durationMinutes") ?? pkg.durationMinutes;
  const phone = str(f, "phone").replace(/\D/g, "").slice(-10);
  if (str(f, "name").length < 2 || !/^[6-9]\d{9}$/.test(phone)) return { error: "Guest name and a 10-digit mobile number are required." };
  const guestCount = Math.min(pkg.capacity, Math.max(1, int(f, "guestCount") ?? 1));
  const session =
    pkg.pricing.kind === "fixed"
      ? resolveSession(pkg, {}, [])
      : pkg.pricing.kind === "hourly"
        ? resolveSession(pkg, { hours: Math.max(1, Math.round(minutes / 60)) }, [])
        : null;
  // Variable sessions: staff enter the total minutes; price = rate × time, never below the starting price.
  const s =
    session && session.ok
      ? session.session
      : {
          workMinutes: minutes,
          setupMinutes: 0,
          durationMinutes: minutes,
          basePrice: Math.max(pkg.pricing.kind === "fixed" ? pkg.price : pkg.pricing.startingPrice, Math.round(((pkg.pricing.kind === "fixed" ? 0 : pkg.pricing.ratePerHour) * minutes) / 60 / 100) * 100),
          minimumApplied: false,
          startingPrice: 0,
          label: pkg.name,
        };
  let hold;
  try {
    hold = await holds.create(pkg.id, `${date}T${time}:00+05:30`, s.durationMinutes);
  } catch (e) {
    return { error: e instanceof SlotTakenError ? "That time is taken (or inside a buffer/closure)." : "Time is outside opening hours or not on the slot grid." };
  }
  const quote = buildQuote(pkg, [], pkg.mode, s, 0)!;
  const b = await createBooking(
    {
      packageId: pkg.id,
      mode: pkg.mode,
      addOnIds: [],
      sessionInput: { staffMinutes: s.durationMinutes },
      durationMinutes: s.durationMinutes,
      guest: { name: str(f, "name"), phone, email: str(f, "email") || "not-given@thirdspace.invalid" },
      guestCount,
      locale: "en",
      subtotal: quote.subtotal,
      discount: 0,
      tax: quote.tax,
      total: quote.total,
      specialRequests: str(f, "notes"),
      utm: { source: "admin" },
      acceptance: { locale: "en", allParticipantsAdult: true, guestsInformed: true, venueRulesAccepted: true, recordingConsent: undefined, promotionalConsent: false, marketingConsent: false },
    },
    hold.id,
    { status: "confirmed", source: "admin", actor: who, payment: quote.total > 0 ? { provider: "venue", kind: "full", amount: quote.total, status: "pending" } : undefined },
  );
  if (bool(f, "notify")) await notifyBooking(b.id, "booking_confirmed");
  redirect(`/admin/bookings/${b.id}`);
}

export async function rescheduleAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("bookings.manage");
  const id = str(f, "bookingId");
  const b = await db.booking.findUnique({ where: { id } });
  if (!b || !["confirmed", "pending_payment"].includes(b.status)) return { error: "Only confirmed or pending bookings can be moved." };
  const date = str(f, "date");
  const time = str(f, "time");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "Pick the new date and time." };
  const moved = await moveBooking(id, `${date}T${time}:00+05:30`);
  if (!moved.ok) return { error: moved.error };
  await audit(null, who, "booking.rescheduled", "Booking", id, { from: b.start, to: `${date}T${time}` });
  if (bool(f, "notify")) await notifyBooking(id, "rescheduled");
  return done([`/admin/bookings/${id}`], "Moved.");
}

export async function manualConfirmAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("bookings.manage");
  const id = str(f, "bookingId");
  const b = await db.booking.findUnique({ where: { id } });
  if (!b || b.status !== "pending_payment") return { error: "Only bookings waiting for payment can be confirmed manually." };
  const amount = money(f, "amount") ?? 0;
  if (Number.isNaN(amount)) return { error: "Enter a valid amount in rupees." };
  const method = ["cash", "upi", "card", "bank"].includes(str(f, "method")) ? str(f, "method") : "upi";
  await db.$transaction([
    db.booking.update({ where: { id }, data: { status: "confirmed", advancePaid: { increment: amount }, balanceDue: { decrement: amount }, holdId: null } }),
    db.payment.updateMany({ where: { bookingId: id, status: "created" }, data: { status: "failed", note: "Superseded by manual confirmation" } }),
    db.payment.create({ data: { bookingId: id, provider: method, kind: "advance", amount, status: amount > 0 ? "captured" : "pending", note: str(f, "note") } }),
    db.hold.deleteMany({ where: { id: b.holdId ?? "" } }),
  ]);
  await audit(null, who, "booking.manually_confirmed", "Booking", id, { amount, method });
  await notifyBooking(id, "booking_confirmed");
  return done([`/admin/bookings/${id}`], "Confirmed.");
}

export async function recordPaymentAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("checkin");
  const id = str(f, "bookingId");
  const b = await db.booking.findUnique({ where: { id } });
  const amount = money(f, "amount");
  if (!b || amount === null || Number.isNaN(amount) || amount <= 0 || amount > b.balanceDue) return { error: `Amount must be above ₹0 and at most ${formatINR(b?.balanceDue ?? 0)}.` };
  const method = ["cash", "upi", "card", "bank"].includes(str(f, "method")) ? str(f, "method") : "upi";
  await db.$transaction([
    db.payment.create({ data: { bookingId: id, provider: method, kind: "balance", amount, status: "captured", note: str(f, "note") } }),
    db.payment.updateMany({ where: { bookingId: id, provider: "venue", status: "pending" }, data: { status: amount >= b.balanceDue ? "captured" : "pending" } }),
    db.booking.update({ where: { id }, data: { advancePaid: { increment: amount }, balanceDue: { decrement: amount }, ...(amount >= b.balanceDue ? { balancePaidAt: new Date() } : {}) } }),
  ]);
  await audit(null, who, "payment.recorded", "Booking", id, { amount, method });
  return done([`/admin/bookings/${id}`], `Recorded ${formatINR(amount)}.`);
}

export async function setProgressAction(f: FormData) {
  const who = await guard("checkin");
  const id = str(f, "bookingId");
  const to = z.enum(["in_progress", "completed", "no_show"]).parse(str(f, "status"));
  await db.booking.update({ where: { id }, data: { status: to } });
  await audit(null, who, `booking.${to}`, "Booking", id);
  revalidatePath(`/admin/bookings/${id}`);
}

export async function markRefundedAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("payments");
  const id = str(f, "bookingId");
  const b = await db.booking.findUnique({ where: { id } });
  if (!b || b.status !== "refund_pending") return { error: "Only bookings with a pending refund." };
  const ref = str(f, "reference");
  if (ref.length < 3) return { error: "Enter the refund reference from Razorpay or the bank." };
  await db.$transaction([
    db.payment.create({ data: { bookingId: id, provider: b.paymentProvider ?? "manual", kind: "refund", refundId: `manual:${ref}`, amount: b.refundAmount ?? 0, status: "refunded", note: ref } }),
    db.booking.update({ where: { id }, data: { status: "refunded" } }),
  ]);
  await audit(null, who, "refund.recorded", "Booking", id, { reference: ref, amount: b.refundAmount });
  return done([`/admin/bookings/${id}`, "/admin/payments"], "Marked refunded.");
}

// ---------------------------------------------------------------- memberships

export async function membershipUsageAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("memberships");
  const id = str(f, "membershipId");
  const minutes = int(f, "minutes");
  const m = await db.creatorMembership.findUnique({ where: { id } });
  if (!m || m.status !== "active") return { error: "Membership is not active." };
  if (!minutes || minutes <= 0 || m.minutesUsed + minutes > m.hoursTotal * 60) return { error: `Minutes must fit in the ${m.hoursTotal * 60 - m.minutesUsed} remaining.` };
  await db.$transaction([
    db.membershipUsage.create({ data: { membershipId: id, minutes, note: str(f, "note"), recordedBy: who, bookingId: str(f, "bookingId") || null } }),
    db.creatorMembership.update({ where: { id }, data: { minutesUsed: { increment: minutes } } }),
  ]);
  await audit(null, who, "membership.usage", "CreatorMembership", id, { minutes });
  return done(["/admin/memberships"], `Recorded ${minutes} min.`);
}

// ---------------------------------------------------------------- recordings

export async function attachRecordingAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("recordings");
  const bookingId = str(f, "bookingId");
  const url = str(f, "url");
  const days = int(f, "expiryDays") ?? 7;
  const keepDays = int(f, "deleteAfterDays") ?? 30;
  const b = await db.booking.findUnique({ where: { id: bookingId } });
  if (!b) return { error: "No booking with that ID." };
  if (!/^https:\/\//.test(url)) return { error: "Paste the https link of the uploaded file (Drive, Dropbox, storage bucket…)." };
  if (!days || days < 1 || days > 30) return { error: "Link expiry: 1 to 30 days." };
  const rec = await db.recordingFile.create({
    data: {
      bookingId,
      label: str(f, "label") || "Recording",
      url,
      token: randomBytes(18).toString("base64url"),
      expiresAt: new Date(Date.now() + days * 86400_000),
      deleteAfter: new Date(Date.now() + Math.max(days, keepDays) * 86400_000),
      createdBy: who,
    },
  });
  await audit(null, who, "recording.attached", "Booking", bookingId, { file: rec.id, expiresInDays: days });
  if (bool(f, "notify")) await notifyBooking(bookingId, "recording_ready");
  await db.recordingFile.update({ where: { id: rec.id }, data: { deliveredAt: bool(f, "notify") ? new Date() : null } });
  return done([`/admin/bookings/${bookingId}`, "/admin/recordings"], "Attached.");
}

export async function revokeRecordingAction(f: FormData) {
  const who = await guard("recordings");
  const id = str(f, "fileId");
  const r = await db.recordingFile.update({ where: { id }, data: { expiresAt: new Date() } });
  await audit(null, who, "recording.revoked", "Booking", r.bookingId, { file: id });
  revalidatePath("/admin/recordings");
}

// ---------------------------------------------------------------- content and customers

export async function saveTestimonialAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("content");
  if (str(f, "name").length < 2 || str(f, "text").length < 10 || str(f, "source").length < 3) return { error: "Name, text and source (where it was posted) are required. Only real reviews." };
  const rating = int(f, "rating");
  const t = await db.testimonial.create({ data: { name: str(f, "name"), text: str(f, "text"), source: str(f, "source"), rating: rating && rating >= 1 && rating <= 5 ? rating : null } });
  await audit(null, who, "testimonial.added", "Testimonial", t.id);
  return done(["/admin/content", "/"], "Added.");
}

export async function saveGalleryImageAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("content");
  if (!/^https:\/\//.test(str(f, "url")) || str(f, "alt").length < 3) return { error: "Image https URL and a description are required." };
  const g = await db.galleryImage.create({ data: { url: str(f, "url"), alt: str(f, "alt"), category: str(f, "category") || "studio", sortOrder: int(f, "sortOrder") ?? 0 } });
  await audit(null, who, "gallery.added", "GalleryImage", g.id);
  return done(["/admin/content", "/gallery", "/"], "Added.");
}

export async function toggleContentAction(f: FormData) {
  const who = await guard("content");
  const id = str(f, "id");
  if (str(f, "type") === "testimonial") {
    const t = await db.testimonial.findUnique({ where: { id } });
    if (t) await db.testimonial.update({ where: { id }, data: { active: !t.active } });
  } else {
    const g = await db.galleryImage.findUnique({ where: { id } });
    if (g) await db.galleryImage.update({ where: { id }, data: { active: !g.active } });
  }
  await audit(null, who, "content.toggled", str(f, "type"), id);
  revalidatePath("/admin/content");
}

/** Data deletion request: anonymise personal data, keep financial/legal records. */
export async function anonymiseCustomerAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("customers");
  const id = str(f, "customerId");
  const c = await db.customer.findUnique({ where: { id }, include: { bookings: true } });
  if (!c) return { error: "Not found." };
  if (c.bookings.some((b) => b.start > new Date() && ["confirmed", "pending_payment"].includes(b.status))) return { error: "Cancel or finish upcoming bookings first." };
  const tag = `deleted-${c.id.slice(0, 8)}`;
  await db.$transaction([
    db.booking.updateMany({ where: { customerId: id }, data: { guestName: "Deleted guest", guestEmail: `${tag}@deleted.invalid`, guestPhone: "0000000000", specialRequests: "" } }),
    db.customer.update({ where: { id }, data: { name: "Deleted guest", email: `${tag}@deleted.invalid`, phone: tag, notes: "", deletionRequested: new Date(), marketingConsent: false } }),
  ]);
  await audit(null, who, "customer.anonymised", "Customer", id);
  return done(["/admin/customers"], "Personal data removed. Booking and payment records were kept, anonymised.");
}

export async function saveAssetAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("calendar");
  const name = str(f, "name");
  const kind = str(f, "kind") === "equipment" ? "equipment" : "staff";
  const ids = f.getAll("packageIds").map(String).filter((id) => getPackage(id));
  if (name.length < 2 || ids.length < 1) return { error: "Name it and tick at least one package that needs it." };
  const a = await db.sharedAsset.create({ data: { name, kind, packages: { create: ids.map((packageId) => ({ packageId })) } } });
  invalidateCatalog();
  await audit(null, who, "asset.created", "SharedAsset", a.id, { name, kind, packages: ids });
  return done(["/admin/calendar"], `Saved ${name}. Bookings that need it can no longer overlap.`);
}

// ---------------------------------------------------------------- guest feedback → testimonials

/** Publishes a guest's feedback as a testimonial. Only when the guest ticked consent and wrote a comment. */
export async function publishFeedbackAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("content");
  const fb = await db.feedback.findUnique({ where: { id: str(f, "id") }, include: { booking: true } });
  if (!fb) return { error: "Feedback not found." };
  if (!fb.allowPublish) return { error: "The guest did not allow publishing this feedback." };
  if (fb.comment.length < 10) return { error: "Only feedback with a written comment can be published." };
  if (fb.testimonialId) return { error: "Already published." };
  const date = fb.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  const t = await db.testimonial.create({ data: { name: fb.displayName || "Guest", text: fb.comment, source: `Verified guest feedback, ${date}`, rating: fb.rating } });
  await db.feedback.update({ where: { id: fb.id }, data: { publishedAt: new Date(), testimonialId: t.id } });
  await audit(null, who, "feedback.published", "Feedback", fb.id, { testimonialId: t.id });
  return done(["/admin/content", "/"], "Published on the website.");
}

// ---------------------------------------------------------------- equipment & facilities per space

/**
 * Equipment and facilities shown on the public space pages. One item per line:
 * "Name — detail" (detail optional). Empty list hides the section; nothing is shown that staff did not enter.
 */
export async function saveEquipmentAction(_: ActionState, f: FormData): Promise<ActionState> {
  const who = await guard("calendar");
  const resource = str(f, "resource");
  if (!["room", "studio"].includes(resource)) return { error: "Unknown space." };
  const items = String(f.get("items") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 40)
    .map((l) => {
      const [name, ...rest] = l.split(/\s+[—–-]\s+/);
      return { name: name.slice(0, 80), detail: rest.join(" — ").slice(0, 160) };
    });
  const row = await db.setting.findUnique({ where: { key: "equipment" } });
  const value = { ...((row?.value as Record<string, { name: string; detail: string }[]>) ?? {}), [resource]: items };
  await db.setting.upsert({ where: { key: "equipment" }, create: { key: "equipment", value, updatedBy: who }, update: { value, updatedBy: who } });
  await audit(null, who, "equipment.saved", "Setting", resource, { count: items.length });
  return done(["/admin/calendar", "/podcast-studio", "/creative-studio", "/private-theatre"], `Saved ${items.length} item(s).`);
}
