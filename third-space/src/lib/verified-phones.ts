import "server-only";

/** Phones that passed OTP in the last 30 minutes (in-memory, mock-grade). */
const g = globalThis as unknown as { __tsVerified?: Map<string, number> };
const verified = (g.__tsVerified ??= new Map<string, number>());
const TTL = 30 * 60_000;

export function markVerified(phone: string) {
  verified.set(phone, Date.now() + TTL);
}

export function isVerified(phone: string) {
  const exp = verified.get(phone);
  return !!exp && exp > Date.now();
}
