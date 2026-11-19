/**
 * Contracts for the slot engine. The public site and the admin panel talk to
 * these interfaces only; ./engine.ts implements them on Postgres.
 */

export type SlotStatus = "available" | "held" | "booked" | "blocked" | "past";
export type Resource = "room" | "studio";

export type Slot = { start: string; end: string; status: SlotStatus };

export type Hold = { id: string; packageId: string; start: string; end: string; expiresAt: string };

export type GuestDetails = { name: string; phone: string; email: string };

export type AcceptanceInput = {
  locale: string;
  allParticipantsAdult: boolean;
  guestsInformed: boolean;
  venueRulesAccepted: boolean;
  recordingConsent?: boolean;
  promotionalConsent: boolean;
  marketingConsent: boolean;
};

export type BookingDraft = {
  packageId: string;
  mode: string;
  addOnIds: string[];
  themeId?: string;
  guest: GuestDetails;
  guestCount: number;
  locale: string;
  total: number;
  advancePaid: number;
  balanceDue: number;
  utm: Record<string, string>;
  acceptance: AcceptanceInput;
};

export type PaymentOrder = { orderId: string; amount: number; provider: string; keyId?: string };

export class SlotTakenError extends Error {
  constructor() {
    super("SLOT_TAKEN");
  }
}
export class HoldExpiredError extends Error {
  constructor() {
    super("HOLD_EXPIRED");
  }
}

export interface AvailabilityService {
  slotsFor(date: string, packageId: string, now?: Date): Promise<Slot[]>;
}

export interface HoldService {
  create(packageId: string, start: string, now?: Date): Promise<Hold>;
  get(holdId: string, now?: Date): Promise<Hold | null>;
  release(holdId: string): Promise<void>;
}

export interface PaymentService {
  readonly provider: string;
  createOrder(amount: number, receipt: string): Promise<PaymentOrder>;
  /** Verify the gateway's success callback. */
  verify(input: { orderId: string; paymentId?: string; signature?: string }): Promise<{ ok: boolean; paymentId?: string }>;
}

export interface OtpService {
  readonly isMock: boolean;
  send(phone: string): Promise<void>;
  verify(phone: string, code: string): Promise<boolean>;
  isVerified(phone: string): Promise<boolean>;
}
