import "server-only";
import { booking } from "@/config/site";
import { otpMode } from "@/server/otp";
import { onlinePaymentsEnabled } from "@/server/payments";

/** Runtime switches the booking flow needs: OTP step and online advance payment. */
export function flowEnv() {
  const online = onlinePaymentsEnabled();
  return { otpMode: otpMode(), advancePercent: online ? booking.advancePercent : 0 };
}
