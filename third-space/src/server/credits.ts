import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";

/**
 * Credit ledger service. A membership's balance is SUM(CreditEntry.minutes).
 * The database enforces the hard rules (balance never negative, rows append-only,
 * `key` unique); this module adds idempotency and readable errors.
 */

export type CreditKind = "purchase" | "consume" | "restore" | "adjust" | "expire";
type Tx = Prisma.TransactionClient;

export class InsufficientCreditsError extends Error {
  constructor(public balance: number) {
    super("INSUFFICIENT_CREDITS");
  }
}

export async function balanceOf(client: Tx | typeof db, membershipId: string): Promise<number> {
  const r = await client.creditEntry.aggregate({ where: { membershipId }, _sum: { minutes: true } });
  return r._sum.minutes ?? 0;
}

/** Balances for many memberships in one query. Missing ids have no entries and read as 0. */
export async function balancesFor(ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>(ids.map((i) => [i, 0]));
  if (!ids.length) return out;
  const rows = await db.creditEntry.groupBy({ by: ["membershipId"], where: { membershipId: { in: ids } }, _sum: { minutes: true } });
  for (const r of rows) out.set(r.membershipId, r._sum.minutes ?? 0);
  return out;
}

export type Posting = {
  membershipId: string;
  kind: CreditKind;
  /** Signed minutes. purchase/restore > 0, consume/expire < 0, adjust either. */
  minutes: number;
  bookingId?: string | null;
  note?: string;
  actor: string;
  /** Idempotency key: posting the same key twice returns the first entry and changes nothing. */
  key?: string;
};

/**
 * Appends one ledger entry inside the caller's transaction.
 * Returns `{ entry, created }`; `created` is false when the key was already used.
 */
export async function postCredit(tx: Tx, p: Posting) {
  if (p.key) {
    const existing = await tx.creditEntry.findUnique({ where: { key: p.key } });
    if (existing) return { entry: existing, created: false as const };
  }
  try {
    const entry = await tx.creditEntry.create({
      data: { membershipId: p.membershipId, kind: p.kind, minutes: p.minutes, bookingId: p.bookingId ?? null, note: p.note ?? "", actor: p.actor, key: p.key ?? null },
    });
    return { entry, created: true as const };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && p.key) {
      // Lost a race on the same key: the other writer's entry stands.
      const existing = await tx.creditEntry.findUnique({ where: { key: p.key } });
      if (existing) return { entry: existing, created: false as const };
    }
    if (/insufficient_credits/i.test(String((e as Error)?.message))) {
      throw new InsufficientCreditsError(await balanceOf(db, p.membershipId));
    }
    throw e;
  }
}

/** Convenience: one posting in its own transaction. */
export function post(p: Posting) {
  return db.$transaction((tx) => postCredit(tx, p));
}

/**
 * Cancellation reversal: gives back what a booking consumed, once.
 * Returns the minutes restored (0 when nothing was consumed or already restored).
 */
export async function restoreForBooking(tx: Tx, bookingId: string, actor: string, note = "Booking cancelled") {
  const consumed = await tx.creditEntry.findMany({ where: { bookingId, kind: "consume" } });
  let restored = 0;
  for (const c of consumed) {
    const r = await postCredit(tx, { membershipId: c.membershipId, kind: "restore", minutes: -c.minutes, bookingId, note, actor, key: `restore:${c.id}` });
    if (r.created) restored += -c.minutes;
  }
  return restored;
}

/** Expiry: writes off whatever is left. Idempotent per membership. */
export async function expireMembership(tx: Tx, membershipId: string, actor = "system") {
  const bal = await balanceOf(tx, membershipId);
  if (bal <= 0) return 0;
  await postCredit(tx, { membershipId, kind: "expire", minutes: -bal, note: "Plan expired", actor, key: `expire:${membershipId}` });
  return bal;
}
