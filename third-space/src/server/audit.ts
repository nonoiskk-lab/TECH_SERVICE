import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/server/db";

type Client = PrismaClient | Prisma.TransactionClient;

/** Append an audit entry. Never log full phone/email/ID numbers in details. */
export async function audit(client: Client | null, actor: string, action: string, entity: string, entityId?: string | null, details?: Record<string, unknown>) {
  await (client ?? db).auditLog.create({
    data: { actor, action, entity, entityId: entityId ?? null, details: details ? (JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue) : undefined },
  });
}
