import { PrismaClient } from "@prisma/client";

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Global safety net: passwordHash must never leak through any API response,
    // including nested `include: { someUserRelation: true }` calls scattered
    // across the app. The login route explicitly opts back in with
    // `omit: { passwordHash: false }` since it's the one place that needs it.
    omit: { user: { passwordHash: true } },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
