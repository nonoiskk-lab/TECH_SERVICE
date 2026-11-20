"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { FEEDBACK_STATUSES } from "@/lib/feedback";

export type FeedbackState = { error?: string } | undefined;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();


/** Guest rates a finished session once, through the private link in the feedback message. */
export async function submitFeedbackAction(_: FeedbackState, f: FormData): Promise<FeedbackState> {
  if (!(await rateLimit(await clientKey("feedback"), 10, 3600))) return { error: "Too many attempts. Try again later." };
  const id = str(f, "bookingId");
  const token = str(f, "token");
  const b = await db.booking.findUnique({ where: { id }, include: { feedback: true } });
  if (!b || b.accessToken !== token) return { error: "This link is not valid." };
  if (!FEEDBACK_STATUSES.includes(b.status)) return { error: "Feedback opens after your session." };
  if (b.feedback) return { error: "You have already rated this visit. Thank you!" };
  const rating = Number(str(f, "rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose a rating from 1 to 5." };
  const comment = str(f, "comment").slice(0, 1000);
  const allowPublish = f.get("allowPublish") === "on";
  // Published name is first name + initial only, never the full name or phone.
  const parts = b.guestName.split(/\s+/).filter(Boolean);
  const displayName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : (parts[0] ?? "Guest");
  await db.feedback.create({ data: { bookingId: id, rating, comment, allowPublish, displayName } });
  await audit(null, "guest", "feedback.submitted", "Booking", id, { rating, allowPublish });
  redirect(`/feedback/${id}?t=${token}&done=1`);
}
