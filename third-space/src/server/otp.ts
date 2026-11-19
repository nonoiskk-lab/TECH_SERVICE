import "server-only";
import { createHash, randomInt } from "node:crypto";
import { db } from "@/server/db";
import type { OtpService } from "@/server/slots/types";

/**
 * Phone OTP backed by Postgres. Codes are stored hashed, expire in 10
 * minutes, allow 5 attempts, and a verified number stays verified for 30
 * minutes. No SMS provider is wired yet: in mock mode (OTP_MODE != "sms") the
 * code is always 123456 and the screen says so.
 */
export const MOCK_OTP_CODE = "123456";
const hash = (phone: string, code: string) => createHash("sha256").update(`${phone}:${code}:${process.env.AUTH_SECRET ?? ""}`).digest("hex");

/**
 * OTP_MODE: "sms" (provider, not wired yet), "mock" (code 123456 shown on
 * screen; tests and local) or "off" (no OTP step). Production defaults to
 * "off" so a live site never shows a test code.
 */
export function otpMode(): "sms" | "mock" | "off" {
  const m = (process.env.OTP_MODE ?? "").trim();
  if (m === "sms" || m === "mock" || m === "off") return m;
  return process.env.NODE_ENV === "production" ? "off" : "mock";
}

function isMockMode() {
  return otpMode() === "mock";
}

async function deliver(phone: string, code: string) {
  if (isMockMode()) return;
  // SMS/WhatsApp provider goes here (e.g. MSG91 / Gupshup). Not configured yet.
  void phone;
  void code;
  throw new Error("OTP_PROVIDER_NOT_CONFIGURED");
}

export const otp: OtpService = {
  get isMock() {
    return isMockMode();
  },
  async send(phone) {
    const code = isMockMode() ? MOCK_OTP_CODE : String(randomInt(100000, 1000000));
    await db.otpCode.upsert({
      where: { phone },
      create: { phone, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + 10 * 60_000) },
      update: { codeHash: hash(phone, code), expiresAt: new Date(Date.now() + 10 * 60_000), attempts: 0 },
    });
    await deliver(phone, code);
  },
  async verify(phone, code) {
    const row = await db.otpCode.findUnique({ where: { phone } });
    if (!row || row.expiresAt < new Date() || row.attempts >= 5) return false;
    const ok = row.codeHash === hash(phone, code);
    await db.otpCode.update({
      where: { phone },
      data: ok ? { verifiedUntil: new Date(Date.now() + 30 * 60_000), attempts: 0 } : { attempts: { increment: 1 } },
    });
    return ok;
  },
  async isVerified(phone) {
    if (otpMode() === "off") return true;
    const row = await db.otpCode.findUnique({ where: { phone } });
    return !!row?.verifiedUntil && row.verifiedUntil > new Date();
  },
};
