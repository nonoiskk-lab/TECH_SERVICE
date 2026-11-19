import { en, type Dict } from "./en";
import { hi } from "./hi";
import type { L, Locale } from "@/config/site";

export const LOCALE_COOKIE = "ts_lang";
export const dictionaries: Record<Locale, Dict> = { en, hi };

export function dict(locale: Locale): Dict {
  return dictionaries[locale] ?? en;
}

/** Pick the right side of a bilingual config string. */
export function tl(text: L, locale: Locale): string {
  return text[locale] ?? text.en;
}

export function normalizeLocale(v: string | undefined | null): Locale {
  return v === "hi" ? "hi" : "en";
}

export type { Dict };
