import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined, currency = "INR") {
  const value = amount ?? 0;
  const symbol = currency === "INR" ? "₹" : currency;
  return `${symbol}${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return `${formatDate(d)}, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

export function formatRelativeTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDate(d);
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/** Normalizes an Indian mobile number to E.164-ish digits for wa.me links. */
export function toWhatsAppNumber(mobile: string) {
  const digits = digitsOnly(mobile);
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
