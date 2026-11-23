import { otp } from "@/server/slots";
import { json } from "@/lib/api";
import { createHash } from "node:crypto";
import { clientKey, rateLimit } from "@/server/rate-limit";

/** Phone numbers are personal data: rate-limit keys use a hash, never the raw number. */
const phoneKey = (prefix: string, phone: string) => `${prefix}:${createHash("sha256").update(phone).digest("hex").slice(0, 24)}`;

const PHONE = /^[6-9]\d{9}$/;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: string; phone?: string; code?: string };
  const phone = (body.phone ?? "").replace(/\D/g, "").slice(-10);
  if (!PHONE.test(phone)) return json({ error: "BAD_PHONE" }, 400);
  if (body.action === "send") {
    // Stops SMS bombing (cost) and attempt-counter resets used to brute-force a code.
    if (!(await rateLimit(await clientKey("otp-send"), 10, 3600)) || !(await rateLimit(phoneKey("otp-send-phone", phone), 5, 3600))) return json({ error: "RATE_LIMITED" }, 429);
    try {
      await otp.send(phone);
    } catch {
      return json({ error: "OTP_UNAVAILABLE" }, 503);
    }
    return json({ ok: true });
  }
  if (body.action === "verify") {
    if (!(await rateLimit(await clientKey("otp-verify"), 30, 900)) || !(await rateLimit(phoneKey("otp-verify-phone", phone), 10, 900))) return json({ error: "RATE_LIMITED" }, 429);
  }
  if (body.action === "verify") return json({ ok: await otp.verify(phone, String(body.code ?? "")) });
  return json({ error: "BAD_REQUEST" }, 400);
}
