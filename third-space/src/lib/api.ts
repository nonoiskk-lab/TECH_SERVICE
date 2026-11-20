import "server-only";
import { isLegalGateOpen } from "@/config/site";
import { getPackage } from "@/config/packages";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export { ensureCatalog } from "@/server/catalog";

/** A package is bookable only if it exists and the Legal Gate allows it. Call ensureCatalog() first. */
export function bookablePackage(id: unknown) {
  if (typeof id !== "string") return null;
  const p = getPackage(id);
  if (!p) return null;
  if (p.requiresLegalGate && !isLegalGateOpen()) return null;
  return p;
}
