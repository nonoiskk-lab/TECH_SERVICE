import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Generates a human-readable sequential code like JOB-2026-00001 by counting
 * existing rows with the same prefix and retrying on a unique-constraint
 * collision (handles the rare race between two concurrent creates without
 * needing a dedicated counter table).
 */
export async function generateSequentialCode(opts: {
  prefix: string;
  withYear?: boolean;
  padLength?: number;
  countExisting: (likePrefix: string) => Promise<number>;
  tryCreate: (code: string) => Promise<unknown>;
  maxAttempts?: number;
}): Promise<string> {
  const { prefix, withYear = true, padLength = 5, countExisting, tryCreate, maxAttempts = 5 } = opts;
  const year = new Date().getFullYear();
  const likePrefix = withYear ? `${prefix}-${year}-` : `${prefix}-`;

  let attempt = 0;
  let lastError: unknown;
  while (attempt < maxAttempts) {
    const existing = await countExisting(likePrefix);
    const next = existing + 1 + attempt;
    const code = `${likePrefix}${String(next).padStart(padLength, "0")}`;
    try {
      await tryCreate(code);
      return code;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        lastError = err;
        attempt += 1;
        continue;
      }
      throw err;
    }
  }
  throw lastError ?? new Error(`Could not generate a unique code for prefix ${prefix}`);
}

export function randomToken(length = 24) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

// Accepts an optional transaction client so callers running inside
// prisma.$transaction(...) reuse that same connection instead of requesting
// a second one from the pool — under Supabase's pooled connection (pgbouncer
// mode, few connections per serverless instance), requesting a second
// connection while the first is held open by an in-progress transaction can
// hang until it times out.
export async function nextCustomerCode(client: Prisma.TransactionClient | typeof prisma = prisma): Promise<string> {
  const count = await client.customer.count();
  return `CUST-${String(count + 1).padStart(5, "0")}`;
}
