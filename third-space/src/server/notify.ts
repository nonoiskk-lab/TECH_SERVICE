import "server-only";
import type { Booking } from "@prisma/client";
import { getPackage } from "@/config/packages";
import { contact, siteUrl } from "@/config/site";
import { db } from "@/server/db";
import { istTimeLabel, toIstIso } from "@/server/slots/time";

/**
 * Booking confirmations go to an outbox. No WhatsApp/email provider is wired
 * yet, so staff send queued messages from /admin/notifications with one tap
 * (wa.me link). A provider adapter can later mark them sent automatically.
 */
export async function queueConfirmation(b: Booking) {
  const pkg = getPackage(b.packageId);
  const when = `${b.start.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}, ${istTimeLabel(toIstIso(b.start))}`;
  const link = `${siteUrl()}/book/confirmation/${b.id}?t=${b.accessToken}`;
  const body = [
    `THIRD SPACE booking confirmed.`,
    `Booking ID: ${b.id}`,
    `${pkg?.name.en ?? b.packageId}, ${when}`,
    `Paid: Rs ${b.advancePaid}. Pay at venue: Rs ${b.balanceDue}.`,
    `18+ only. Every guest brings a government photo ID.`,
    `Details and your accepted declaration: ${link}`,
    contact.addressLine ? `Address: ${contact.fullAddress}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  await db.notification.createMany({
    data: [
      { bookingId: b.id, channel: "whatsapp", to: b.guestPhone, body },
      { bookingId: b.id, channel: "email", to: b.guestEmail, body },
    ],
  });
}
