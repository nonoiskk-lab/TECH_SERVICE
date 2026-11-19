import { json } from "@/lib/api";
import { db } from "@/server/db";

const ALLOWED = new Set([
  "view_package", "select_slot", "hold_started", "hold_expired", "payment_started",
  "payment_success", "consent_signed", "whatsapp_click", "enquiry_submitted",
]);

/**
 * Analytics sink. Keeps only per-event counts in Postgres; no PII is ever
 * accepted. Feeds the lead-funnel dashboard later.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { event?: string };
  if (!body.event || !ALLOWED.has(body.event)) return json({ ok: false }, 400);
  await db.eventCount.upsert({ where: { event: body.event }, create: { event: body.event, count: 1 }, update: { count: { increment: 1 } } });
  return json({ ok: true });
}


