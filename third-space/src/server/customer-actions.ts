"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { hashPassword, verifyPassword } from "@/server/admin/auth";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { currentCustomer, endCustomerSession, startCustomerSession } from "@/server/customer-auth";

export type AccountState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const phoneOf = (s: string) => s.replace(/\D/g, "").slice(-10);
const safeNext = (s: string) => (s.startsWith("/") && !s.startsWith("//") ? s : "/account");

/**
 * Create an account. If the phone already has bookings (a Customer row without
 * a password), the account claims that history only when the email matches the
 * one used for those bookings, so nobody can take over another guest's history.
 */
export async function signupAction(_: AccountState, f: FormData): Promise<AccountState> {
  const values = { name: str(f, "name"), phone: str(f, "phone"), email: str(f, "email").toLowerCase() };
  if (!(await rateLimit(await clientKey("signup"), 10, 3600))) return { error: "Too many attempts. Try again later.", values };
  const phone = phoneOf(values.phone);
  const password = str(f, "password");
  if (values.name.length < 2) return { error: "Enter your name.", values };
  if (!/^[6-9]\d{9}$/.test(phone)) return { error: "Enter a 10-digit Indian mobile number.", values };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return { error: "Enter a valid email.", values };
  if (password.length < 8) return { error: "Password needs at least 8 characters.", values };
  if (f.get("age18") !== "on") return { error: "Accounts are for guests aged 18 or older.", values };
  const existing = await db.customer.findUnique({ where: { phone } });
  if (existing?.passwordHash) return { error: "An account with this mobile number already exists. Log in instead.", values };
  if (existing && existing.email.toLowerCase() !== values.email) {
    return { error: "This mobile number has bookings under a different email. Use that email, or message us on WhatsApp.", values };
  }
  const passwordHash = await hashPassword(password);
  const c = existing
    ? await db.customer.update({ where: { id: existing.id }, data: { passwordHash, name: values.name, lastLoginAt: new Date() } })
    : await db.customer.create({ data: { phone, name: values.name, email: values.email, passwordHash, lastLoginAt: new Date() } });
  await audit(null, "guest", "customer.signup", "Customer", c.id, { claimedHistory: !!existing });
  await startCustomerSession(c.id);
  redirect(safeNext(str(f, "next")));
}

export async function customerLoginAction(_: AccountState, f: FormData): Promise<AccountState> {
  const id = str(f, "login").toLowerCase();
  const values = { login: id };
  if (!(await rateLimit(await clientKey("customer-login"), 10, 900))) return { error: "Too many attempts. Wait 15 minutes.", values };
  const where = id.includes("@") ? { email: id } : { phone: phoneOf(id) };
  const c = id.includes("@") ? await db.customer.findFirst({ where, orderBy: { createdAt: "asc" } }) : await db.customer.findUnique({ where: { phone: phoneOf(id) } });
  if (!c?.passwordHash || c.deletionRequested || !(await verifyPassword(str(f, "password"), c.passwordHash))) {
    return { error: "Wrong mobile/email or password.", values };
  }
  await db.customer.update({ where: { id: c.id }, data: { lastLoginAt: new Date() } });
  await startCustomerSession(c.id);
  redirect(safeNext(str(f, "next")));
}

export async function customerLogoutAction() {
  await endCustomerSession();
  redirect("/account/login");
}

export async function updateProfileAction(_: AccountState, f: FormData): Promise<AccountState> {
  const c = await currentCustomer();
  if (!c) redirect("/account/login");
  const name = str(f, "name");
  const email = str(f, "email").toLowerCase();
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter your name and a valid email." };
  const data: { name: string; email: string; marketingConsent: boolean; passwordHash?: string } = { name, email, marketingConsent: f.get("marketing") === "on" };
  const pw = str(f, "newPassword");
  if (pw) {
    if (pw.length < 8) return { error: "New password needs at least 8 characters." };
    if (!(await verifyPassword(str(f, "currentPassword"), c.passwordHash!))) return { error: "Current password is wrong." };
    data.passwordHash = await hashPassword(pw);
  }
  await db.customer.update({ where: { id: c.id }, data });
  await audit(null, "guest", "customer.profile_updated", "Customer", c.id, { passwordChanged: !!pw, marketing: data.marketingConsent });
  return { ok: "Saved." };
}
