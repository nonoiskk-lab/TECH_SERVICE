import "server-only";
import type { Booking, PolicyAcceptance } from "@prisma/client";
import { getPackage } from "@/config/packages";
import { siteUrl } from "@/config/site";
import { POLICY_DOCS, type PolicyDocId } from "@/config/policies";
import { istTimeLabel, toIstIso } from "@/server/slots/time";

const mask = (s: string, keep = 2) => (s.length <= keep ? s : s.slice(0, keep) + "•".repeat(Math.max(0, s.length - keep - 2)) + s.slice(-2));

/** Plain-text copy of what the guest accepted, for download and for staff. */
export function acceptanceCopy(b: Booking, a: PolicyAcceptance): string {
  const pkg = getPackage(b.packageId);
  const docs = (a.documents as { id: PolicyDocId; title: string; version: string }[]).map(
    (d) => `- ${d.title}, version ${d.version}: ${siteUrl()}${POLICY_DOCS[d.id]?.path ?? "/policies"}`,
  );
  const yesNo = (v: boolean | null | undefined) => (v === true ? "Yes" : v === false ? "No" : "Not applicable");
  return [
    "THIRD SPACE — Booking acceptance record",
    "",
    `Booking ID: ${b.id}`,
    `Package: ${pkg?.name.en ?? b.packageId}`,
    `Slot: ${b.start.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}, ${istTimeLabel(toIstIso(b.start))} to ${istTimeLabel(toIstIso(b.end))}`,
    `Guests: ${b.guestCount}`,
    `Booked by: ${b.guestName} (phone ${mask(b.guestPhone)})`,
    "",
    `Accepted at: ${a.acceptedAt.toISOString()} (UTC)`,
    `Language shown: ${a.locale === "hi" ? "Hinglish" : "English"}`,
    `Affirmative action: ${a.action}`,
    `Policy pack version: ${a.policyPackVersion}`,
    "Documents accepted:",
    ...docs,
    "",
    a.declarationText,
    "",
    `All participants are 18+: ${yesNo(a.allParticipantsAdult)}`,
    `Guests informed of the rules: ${yesNo(a.guestsInformed)}`,
    `Venue rules and cancellation tiers accepted: ${yesNo(a.venueRulesAccepted)}`,
    `Recording permission from every participant: ${yesNo(a.recordingConsent)}`,
    `Optional: THIRD SPACE may use my image/voice/recording for promotion: ${yesNo(a.promotionalConsent)}`,
    `Optional: marketing messages: ${yesNo(a.marketingConsent)}`,
    "",
  ].join("\n");
}
