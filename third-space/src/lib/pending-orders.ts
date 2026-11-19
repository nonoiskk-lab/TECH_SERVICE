import "server-only";
import type { Booking } from "@/server/slots";

type Pending = { draft: Omit<Booking, "id" | "createdAt">; holdId: string };
const g = globalThis as unknown as { __tsPending?: Map<string, Pending> };
const pending = (g.__tsPending ??= new Map<string, Pending>());

export function savePending(orderId: string, p: Pending) {
  pending.set(orderId, p);
}
export function takePending(orderId: string) {
  const p = pending.get(orderId);
  pending.delete(orderId);
  return p;
}
