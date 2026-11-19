import { otp } from "@/server/slots";
import { json } from "@/lib/api";

const PHONE = /^[6-9]\d{9}$/;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: string; phone?: string; code?: string };
  const phone = (body.phone ?? "").replace(/\D/g, "").slice(-10);
  if (!PHONE.test(phone)) return json({ error: "BAD_PHONE" }, 400);
  if (body.action === "send") {
    try {
      await otp.send(phone);
    } catch {
      return json({ error: "OTP_UNAVAILABLE" }, 503);
    }
    return json({ ok: true });
  }
  if (body.action === "verify") return json({ ok: await otp.verify(phone, String(body.code ?? "")) });
  return json({ error: "BAD_REQUEST" }, 400);
}
