"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { hashPassword, verifyPassword } from "@/server/admin/auth";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { createHash, randomBytes } from "node:crypto";
import { currentCustomer, endCustomerSession, startCustomerSession } from "@/server/customer-auth";
import { queueAccountEmail } from "@/server/notify";
import { siteUrl } from "@/config/site";

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
  const data: { name: string; email: string; marketingConsent: boolean; passwordHash?: string; sessionsValidFrom?: Date } = { name, email, marketingConsent: f.get("marketing") === "on" };
  const pw = str(f, "newPassword");
  if (pw) {
    if (pw.length < 8) return { error: "New password needs at least 8 characters." };
    if (!(await verifyPassword(str(f, "currentPassword"), c.passwordHash!))) return { error: "Current password is wrong." };
    data.passwordHash = await hashPassword(pw);
    data.sessionsValidFrom = new Date(); // signs out every other device
  }
  await db.customer.update({ where: { id: c.id }, data });
  await audit(null, "guest", "customer.profile_updated", "Customer", c.id, { passwordChanged: !!pw, marketing: data.marketingConsent });
  if (pw) await startCustomerSession(c.id); // keep this device signed in with a fresh session
  return { ok: "Saved." };
}

const RESET_TTL_MS = 30 * 60_000;
const tokenHash = (t: string) => createHash("sha256").update(t).digest("hex");

/**
 * "Forgot password". Always answers the same way, so nobody can learn which mobile numbers or
 * emails have accounts. If the account exists, a single-use link (valid 30 minutes) is queued to
 * the email on file; it is sent when an email provider is configured, otherwise staff see it in the outbox.
 */
export async function requestPasswordResetAction(_: AccountState, f: FormData): Promise<AccountState> {
  const id = str(f, "login").toLowerCase();
  const generic: AccountState = { ok: "If an account matches, a reset link has been sent to its email. The link works for 30 minutes.", values: { login: id } };
  if (!id) return { error: "Enter your mobile number or email.", values: { login: id } };
  if (!(await rateLimit(await clientKey("pw-reset"), 5, 3600))) return { error: "Too many attempts. Try again in an hour.", values: { login: id } };
  const c = id.includes("@") ? await db.customer.findFirst({ where: { email: id, passwordHash: { not: null } }, orderBy: { createdAt: "asc" } }) : await db.customer.findUnique({ where: { phone: phoneOf(id) } });
  if (!c?.passwordHash || c.deletionRequested) return generic;
  if (!(await rateLimit(`pw-reset-acct:${tokenHash(c.id).slice(0, 24)}`, 3, 3600))) return generic; // silent: do not reveal the account exists
  const token = randomBytes(32).toString("base64url");
  await db.passwordReset.create({ data: { customerId: c.id, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) } });
  await queueAccountEmail(c.email, "password_reset", `THIRD SPACE: use this link to choose a new password (valid 30 minutes, works once): ${siteUrl()}/account/reset/${token}. If you did not ask for this, ignore this message.`);
  await audit(null, "guest", "customer.reset_requested", "Customer", c.id);
  return generic;
}

/** Sets the new password from a valid link, ends every old session, and signs the guest in. */
export async function resetPasswordAction(_: AccountState, f: FormData): Promise<AccountState> {
  const token = str(f, "token");
  const password = str(f, "password");
  if (password.length < 8) return { error: "Password needs at least 8 characters." };
  if (password !== str(f, "confirm")) return { error: "The two passwords do not match." };
  if (!(await rateLimit(await clientKey("pw-reset-use"), 10, 900))) return { error: "Too many attempts. Wait 15 minutes." };
  const row = await db.passwordReset.findUnique({ where: { tokenHash: tokenHash(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return { error: "This link has expired or was already used. Ask for a new one." };
  const passwordHash = await hashPassword(password);
  const now = new Date();
  // Consume the link and change the password in one transaction; a second use finds usedAt set.
  const claimed = await db.$transaction(async (tx) => {
    const used = await tx.passwordReset.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } });
    if (used.count !== 1) return false;
    await tx.customer.update({ where: { id: row.customerId }, data: { passwordHash, sessionsValidFrom: now, lastLoginAt: now } });
    await tx.passwordReset.updateMany({ where: { customerId: row.customerId, usedAt: null }, data: { usedAt: now } }); // other open links die too
    return true;
  });
  if (!claimed) return { error: "This link has expired or was already used. Ask for a new one." };
  await audit(null, "guest", "customer.password_reset", "Customer", row.customerId);
  await startCustomerSession(row.customerId);
  redirect("/account");
}
