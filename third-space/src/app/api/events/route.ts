import { json } from "@/lib/api";

const ALLOWED = new Set([
  "view_package", "select_slot", "hold_started", "hold_expired", "payment_started",
  "payment_success", "consent_signed", "whatsapp_click", "enquiry_submitted",
]);
const g = globalThis as unknown as { __tsEvents?: Map<string, number> };
const counts = (g.__tsEvents ??= new Map<string, number>());

/**
 * Analytics sink (mock). Keeps only per-event counts in memory; no PII is ever
 * accepted. Feeds the lead-funnel dashboard later.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { event?: string };
  if (!body.event || !ALLOWED.has(body.event)) return json({ ok: false }, 400);
  counts.set(body.event, (counts.get(body.event) ?? 0) + 1);
  return json({ ok: true });
}

export async function GET() {
  return json(Object.fromEntries(counts));
}
