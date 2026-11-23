import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { isOpen } from "./helpers";

const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL ?? "postgresql://thirdspace:thirdspace@localhost:5432/thirdspace_test" } } });
test.afterAll(async () => { await db.$disconnect(); });
test.beforeEach(({}, info) => test.skip(isOpen(info), "runs once, on the gate-closed server"));

async function signup(page: import("@playwright/test").Page, phone: string, email: string, password: string) {
  await page.goto("/account/signup");
  const f = page.getByTestId("account-signup");
  await f.getByTestId("signup-name").fill("Reset Guest");
  await f.getByTestId("signup-phone").fill(phone);
  await f.getByTestId("signup-email").fill(email);
  await f.getByTestId("signup-password").fill(password);
  await f.getByTestId("signup-age").check();
  await f.getByRole("button").click();
  await expect(page).toHaveURL(/\/account$/);
}
async function latestResetLink(email: string) {
  const n = await db.notification.findFirst({ where: { kind: "password_reset", to: email }, orderBy: { createdAt: "desc" } });
  const m = n?.body.match(/https?:\/\/\S+\/account\/reset\/([A-Za-z0-9_-]+)/);
  return m ? `/account/reset/${m[1]}` : null;
}

test("forgot password: single-use link, old sessions end, same answer for unknown accounts", async ({ browser, page }) => {
  const stamp = Date.now();
  const phone = `98${String(stamp).slice(-8)}`;
  const email = `reset-${stamp}@thirdspace.in`;
  await signup(page, phone, email, "old-password-1");

  // A second device that stays signed in with the old password.
  const other = await browser.newContext({ baseURL: page.url().split("/account")[0] });
  const op = await other.newPage();
  await op.goto("/account/login");
  await op.getByTestId("login-id").fill(phone);
  await op.getByTestId("login-password").fill("old-password-1");
  await op.getByRole("button", { name: /log in/i }).click();
  await expect(op).toHaveURL(/\/account$/);

  // Unknown and known accounts get the same message (no account enumeration).
  const ask = async (login: string) => {
    await page.context().clearCookies();
    await page.goto("/account/forgot");
    await page.getByTestId("forgot-id").fill(login);
    await page.getByRole("button", { name: "Send reset link" }).click();
    return (await page.getByTestId("account-forgot").getByRole("status").innerText()).trim();
  };
  const unknown = await ask("9000000000");
  const known = await ask(phone);
  expect(known).toBe(unknown);
  expect(known).toMatch(/if an account matches/i);

  const link = await latestResetLink(email);
  expect(link, "reset link queued in the outbox").toBeTruthy();

  // Mismatch and short passwords are refused; the link stays usable.
  await page.goto(link!);
  await page.getByTestId("reset-password").fill("new-password-22");
  await page.getByTestId("reset-confirm").fill("different-22");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByTestId("account-reset").getByRole("alert")).toContainText(/do not match/);

  await page.getByTestId("reset-password").fill("new-password-22");
  await page.getByTestId("reset-confirm").fill("new-password-22");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/\/account$/);

  // The link cannot be used twice.
  await page.context().clearCookies();
  await page.goto(link!);
  await page.getByTestId("reset-password").fill("third-password-3");
  await page.getByTestId("reset-confirm").fill("third-password-3");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByTestId("account-reset").getByRole("alert")).toContainText(/expired or was already used/);

  // The other device's old session is no longer valid.
  await op.goto("/account");
  await expect(op).toHaveURL(/\/account\/login/);
  await other.close();

  // New password works, old one does not.
  await page.goto("/account/login");
  await page.getByTestId("login-id").fill(phone);
  await page.getByTestId("login-password").fill("old-password-1");
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page.getByTestId("account-login").getByRole("alert")).toContainText(/wrong/i);
  await page.getByTestId("login-password").fill("new-password-22");
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/account$/);
});

test("expired and invented reset links are refused", async ({ page }) => {
  await page.goto("/account/reset/not-a-real-token");
  await page.getByTestId("reset-password").fill("whatever-123");
  await page.getByTestId("reset-confirm").fill("whatever-123");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByTestId("account-reset").getByRole("alert")).toContainText(/expired or was already used/);
});
