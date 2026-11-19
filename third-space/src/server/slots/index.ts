import "server-only";
/**
 * Service wiring. Slots, holds, bookings, leads and OTP are stored in
 * Postgres. Payments use Razorpay when keys are set, otherwise a mock. OTP
 * delivery and WhatsApp/email sending have no provider yet (see STAGE_REPORT).
 */
export { availability, holds, createBooking, getBookingForGuest, resourceOf } from "./engine";
export { otp } from "@/server/otp";
export { paymentService } from "@/server/payments";
export * from "./types";
