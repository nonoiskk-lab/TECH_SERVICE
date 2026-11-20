import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, dict, normalizeLocale } from "@/i18n";
import { ensureCatalog } from "@/server/catalog";

export async function getLocale() {
  const c = await cookies();
  return normalizeLocale(c.get(LOCALE_COOKIE)?.value);
}

export async function getDict() {
  await ensureCatalog();
  const locale = await getLocale();
  return { locale, t: dict(locale) };
}
