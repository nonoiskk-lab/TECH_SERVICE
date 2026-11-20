import "server-only";
import { isLegalGateOpen } from "@/config/site";
import { db } from "@/server/db";
import type { TitleInfo } from "@/lib/session";

/** Active licensed titles. Empty while the Legal Gate is closed. */
export async function activeTitles(): Promise<TitleInfo[]> {
  if (!isLegalGateOpen()) return [];
  const rows = await db.title.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return rows.map((r) => ({ id: r.id, name: r.name, runtimeMinutes: r.runtimeMinutes, language: r.language }));
}
