import "server-only";
import type { Booking } from "@prisma/client";
import { getPackage } from "@/config/packages";
import { contact, siteUrl } from "@/config/site";
import { db } from "@/server/db";
import { istTimeLabel, toIstIso } from "@/server/slots/time";

/**
 * Customer notifications (WhatsApp + email).
 *
 * Every message is written to the Notification outbox first, then sent at
 * once if a provider is configured:
 *  - WhatsApp Business Cloud API: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID and
 *    one approved template per kind (WHATSAPP_TEMPLATE_<KIND>, e.g.
 *    WHATSAPP_TEMPLATE_BOOKING_CONFIRMED). Business-initiated WhatsApp messages
 *    must use approved templates; the body text below is what each template
 *    should say, with {{1}} = name, {{2}} = booking ID, {{3}} = when, {{4}} = link.
 *  - Email via Resend: RESEND_API_KEY, EMAIL_FROM.
 * Without a provider the message stays "queued" and staff send it from
 * /admin/notifications with one tap.
 */
export type NotifyKind =
  | "enquiry_received"
  | "booking_confirmed"
  | "payment_received"
  | "payment_pending"
  | "payment_issue"
  | "reminder_24h"
  | "reminder_2h"
  | "rescheduled"
  | "cancelled"
  | "recording_ready"
  | "feedback_request";

function when(b: Booking) {
  const day = b.start.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  return `${day}, ${istTimeLabel(toIstIso(b.start))}`;
}

export function manageLink(b: Booking) {
  return `${siteUrl()}/my-booking/${b.id}?t=${b.accessToken}`;
}

/** Private link to the 1-minute feedback form for this booking. */
export function feedbackLink(b: Booking) {
  return `${siteUrl()}/feedback/${b.id}?t=${b.accessToken}`;
}

export function messageFor(kind: NotifyKind, b: Booking, extra: { link?: string } = {}) {
  const pkg = getPackage(b.packageId)?.name.en ?? b.packageName ?? b.packageId;
  const link = extra.link ?? manageLink(b);
  const head = `THIRD SPACE: Hi ${b.guestName.split(" ")[0]},`;
  const lines: Record<NotifyKind, string[]> = {
    enquiry_received: [head, "we got your enquiry and will reply on WhatsApp soon."],
    booking_confirmed: [
      head,
      `your booking ${b.id} is confirmed.`,
      `${pkg}, ${when(b)}, ${b.guestCount} guest(s).`,
      b.advancePaid > 0 ? `Paid: Rs ${b.advancePaid}. Pay at venue: Rs ${b.balanceDue}.` : `Pay at venue: Rs ${b.balanceDue}.`,
      "18+ only. Every guest brings a government photo ID.",
      `Manage your booking: ${link}`,
      contact.addressLine ? `Address: ${contact.fullAddress}` : "",
    ],
    payment_received: [head, `we received Rs ${b.advancePaid} for booking ${b.id} (${pkg}, ${when(b)}).`, `Balance at venue: Rs ${b.balanceDue}.`, `Details: ${link}`],
    payment_pending: [head, `your booking ${b.id} is waiting for payment. Finish paying to keep the slot, or it will be released.`, `Details: ${link}`],
    payment_issue: [head, `we received your payment for ${b.id}, but the slot was taken before it completed. We will refund you in full or move you to another slot. We will call you shortly.`],
    reminder_24h: [head, `reminder: ${pkg} tomorrow, ${when(b)}. Please arrive 10 minutes early with a photo ID for every guest.`, `Details: ${link}`],
    reminder_2h: [head, `see you in about 2 hours: ${pkg}, ${when(b)}.`, contact.mapUrl ? `Directions: ${contact.mapUrl}` : ""],
    rescheduled: [head, `your booking ${b.id} is moved to ${when(b)}.`, `Details: ${link}`],
    cancelled: [head, `your booking ${b.id} (${when(b)}) is cancelled.`, b.refundAmount ? `Refund: Rs ${b.refundAmount}, processed to your original payment method.` : "", `Details: ${link}`],
    recording_ready: [head, `your recording from ${when(b)} is ready. Download it here (private link): ${link}`],
    feedback_request: [head, "thank you for visiting THIRD SPACE. How was it? Rate your visit in one minute:", feedbackLink(b)],
  };
  return lines[kind].filter(Boolean).join("\n");
}

async function sendWhatsApp(kind: NotifyKind, to: string, b: Booking | null, body: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const template = process.env[`WHATSAPP_TEMPLATE_${kind.toUpperCase()}`]?.trim();
  if (!token || !phoneId || !template) return { ok: false, error: "not_configured" };
  const params = b ? [b.guestName.split(" ")[0], b.id, when(b), kind === "feedback_request" ? feedbackLink(b) : manageLink(b)] : [body.slice(0, 900)];
  const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: `91${to.replace(/\D/g, "").slice(-10)}`,
      type: "template",
      template: { name: template, language: { code: process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "en" }, components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] },
    }),
  }).catch((e: Error) => ({ ok: false, status: 0, text: async () => e.message }) as unknown as Response);
  return r.ok ? { ok: true } : { ok: false, error: `whatsapp_${r.status}: ${(await r.text()).slice(0, 200)}` };
}

async function sendEmail(to: string, subject: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !from) return { ok: false, error: "not_configured" };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject, text: body }),
  }).catch((e: Error) => ({ ok: false, status: 0, text: async () => e.message }) as unknown as Response);
  return r.ok ? { ok: true } : { ok: false, error: `email_${r.status}: ${(await r.text()).slice(0, 200)}` };
}

const SUBJECTS: Record<NotifyKind, string> = {
  enquiry_received: "We got your enquiry",
  booking_confirmed: "Booking confirmed",
  payment_received: "Payment received",
  payment_pending: "Finish your payment",
  payment_issue: "About your payment",
  reminder_24h: "See you tomorrow",
  reminder_2h: "See you soon",
  rescheduled: "Booking rescheduled",
  cancelled: "Booking cancelled",
  recording_ready: "Your recording is ready",
  feedback_request: "How was your visit?",
};

/** Try to deliver one outbox row now. */
export async function deliver(id: string) {
  const n = await db.notification.findUnique({ where: { id }, include: { booking: true } });
  if (!n || n.status !== "queued" || n.sendAfter > new Date()) return;
  const r = n.channel === "whatsapp" ? await sendWhatsApp(n.kind as NotifyKind, n.to, n.booking, n.body) : await sendEmail(n.to, `THIRD SPACE: ${SUBJECTS[n.kind as NotifyKind] ?? "Update"}`, n.body);
  if (r.ok) await db.notification.update({ where: { id }, data: { status: "sent", sentAt: new Date(), error: null } });
  else if (r.error !== "not_configured") await db.notification.update({ where: { id }, data: { error: r.error } });
}

/** Queue WhatsApp + email for a booking event and try to send them at once. */
export async function notifyBooking(bookingId: string, kind: NotifyKind, opts: { sendAfter?: Date; link?: string } = {}) {
  const b = await db.booking.findUnique({ where: { id: bookingId } });
  if (!b) return;
  const body = messageFor(kind, b, { link: opts.link });
  const sendAfter = opts.sendAfter ?? new Date();
  const rows = await db.$transaction([
    db.notification.create({ data: { bookingId, kind, channel: "whatsapp", to: b.guestPhone, body, sendAfter } }),
    db.notification.create({ data: { bookingId, kind, channel: "email", to: b.guestEmail, body, sendAfter } }),
  ]);
  if (sendAfter <= new Date()) for (const r of rows) await deliver(r.id).catch(() => undefined);
}

/** Enquiry acknowledgement (no booking). */
export async function notifyEnquiry(phone: string, name: string) {
  const body = `THIRD SPACE: Hi ${name.split(" ")[0]}, we got your enquiry and will reply on WhatsApp soon.`;
  const row = await db.notification.create({ data: { kind: "enquiry_received", channel: "whatsapp", to: phone, body } });
  await deliver(row.id).catch(() => undefined);
}

/** Provider status for the admin readiness panel. */
export function providerStatus() {
  return {
    whatsapp: !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    email: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
  };
}
