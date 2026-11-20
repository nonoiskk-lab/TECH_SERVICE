import "server-only";
import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { __tsPrisma?: PrismaClient };
export const db = (g.__tsPrisma ??= new PrismaClient());
