import "server-only";
import { booking } from "@/config/site";
import { otpMode } from "@/server/otp";
import { onlinePaymentsEnabled } from "@/server/payments";
import { clientCatalog } from "@/server/catalog";

/** Runtime switches and catalogue values the booking flow needs. Call after ensureCatalog(). */
export function flowEnv() {
  const online = onlinePaymentsEnabled();
  return { otpMode: otpMode(), advancePercent: online ? booking.advancePercent : 0, catalog: clientCatalog() };
}
