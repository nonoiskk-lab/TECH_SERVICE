import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, dict, normalizeLocale } from "@/i18n";

export async function getLocale() {
  const c = await cookies();
  return normalizeLocale(c.get(LOCALE_COOKIE)?.value);
}

export async function getDict() {
  const locale = await getLocale();
  return { locale, t: dict(locale) };
}
