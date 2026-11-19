import { otp } from "@/server/slots";
import { json } from "@/lib/api";
import { markVerified } from "@/lib/verified-phones";

const PHONE = /^[6-9]\d{9}$/;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: string; phone?: string; code?: string };
  const phone = (body.phone ?? "").replace(/\D/g, "").slice(-10);
  if (!PHONE.test(phone)) return json({ error: "BAD_PHONE" }, 400);
  if (body.action === "send") {
    await otp.send(phone);
    return json({ ok: true });
  }
  if (body.action === "verify") {
    const ok = await otp.verify(phone, String(body.code ?? ""));
    if (ok) markVerified(phone);
    return json({ ok });
  }
  return json({ error: "BAD_REQUEST" }, 400);
}
