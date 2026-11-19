import { mockAvailability, mockBookings, mockHolds, mockLeads, mockOtp, mockPayments } from "./mock";
import type { AvailabilityService, BookingService, HoldService, LeadService, OtpService, PaymentService } from "./types";

/**
 * Adapter wiring. Every adapter below is a MOCK until Master Plan S1 (slot
 * engine) and S3 (payments) are merged. Replace them here and nowhere else.
 */
export const availability: AvailabilityService = mockAvailability;
export const holds: HoldService = mockHolds;
export const payments: PaymentService = mockPayments;
export const bookings: BookingService = mockBookings;
export const leads: LeadService = mockLeads;
export const otp: OtpService = mockOtp;

export const MOCKED_SERVICES = ["AvailabilityService", "HoldService", "PaymentService", "BookingService", "LeadService", "OtpService"];

export * from "./types";
