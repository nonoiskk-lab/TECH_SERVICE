/**
 * Contracts for the slot engine (Master Plan S1). The public site only talks to
 * these interfaces. Today they are backed by in-memory mock adapters
 * (./mock.ts); when S1 is merged, swap the adapters in ./index.ts.
 */

export type SlotStatus = "available" | "held" | "booked" | "past";

export type Slot = {
  /** ISO start, IST offset. */
  start: string;
  end: string;
  status: SlotStatus;
};

export type Hold = {
  id: string;
  packageId: string;
  start: string;
  end: string;
  expiresAt: string;
};

export type GuestDetails = { name: string; phone: string; email: string };

export type Booking = {
  id: string;
  packageId: string;
  mode: string;
  start: string;
  end: string;
  addOnIds: string[];
  themeId?: string;
  guest: GuestDetails;
  total: number;
  advancePaid: number;
  balanceDue: number;
  consentAt: string;
  createdAt: string;
};

export type PaymentOrder = { orderId: string; holdId: string; amount: number; provider: string };

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
  /** Slots for one IST date (YYYY-MM-DD) for a package's duration. */
  slotsFor(date: string, packageId: string, now?: Date): Promise<Slot[]>;
}

export interface HoldService {
  create(packageId: string, start: string, now?: Date): Promise<Hold>;
  get(holdId: string, now?: Date): Promise<Hold | null>;
  release(holdId: string): Promise<void>;
}

export interface PaymentService {
  readonly provider: string;
  createOrder(holdId: string, amount: number): Promise<PaymentOrder>;
  /** Mock: always succeeds. Real: verify the gateway signature. */
  confirm(orderId: string): Promise<{ ok: boolean }>;
}

export interface BookingService {
  create(input: Omit<Booking, "id" | "createdAt">, holdId: string): Promise<Booking>;
  get(id: string): Promise<Booking | null>;
}

export type Lead = {
  id: string;
  purpose: string;
  name: string;
  phone: string;
  message: string;
  source: string;
  utm: Record<string, string>;
  createdAt: string;
};

export interface LeadService {
  create(input: Omit<Lead, "id" | "createdAt">): Promise<Lead>;
}

export interface OtpService {
  readonly isMock: boolean;
  send(phone: string): Promise<void>;
  verify(phone: string, code: string): Promise<boolean>;
}
