import { expect, type Page, type TestInfo } from "@playwright/test";

export const isOpen = (info: TestInfo) => info.project.name === "gate-open";

/**
 * Pick a date at least `offset` days after the first bookable date that still
 * has a free slot. Tests share a database across runs, so earlier days fill up.
 */
export async function chooseDate(page: Page, offset: number) {
  const input = page.getByTestId("date-input");
  const min = (await input.getAttribute("min"))!;
  const max = (await input.getAttribute("max"))!;
  for (let k = offset; ; k += 9) {
    const d = new Date(`${min}T12:00:00+05:30`);
    d.setUTCDate(d.getUTCDate() + k);
    const iso = d.toISOString().slice(0, 10);
    if (iso > max) throw new Error("No free date left in the booking window; use a fresh test database");
    await input.fill(iso);
    await expect(page.locator('[data-testid="slot"]').first().or(page.getByText(/No slots left|slot khaali nahi/))).toBeVisible();
    await page.waitForLoadState("networkidle");
    if ((await page.locator('[data-testid="slot"][data-status="available"]').count()) > 0) return iso;
  }
}

export async function firstAvailableSlot(page: Page) {
  return page.locator('[data-testid="slot"][data-status="available"]').first();
}

export async function fillDetailsAndVerify(page: Page) {
  await page.getByTestId("guest-name").fill("Test Guest");
  await page.getByTestId("guest-email").fill("guest@thirdspace.in");
  await page.getByTestId("guest-phone").fill("9876543210");
  await page.getByTestId("send-otp").click();
  await page.getByTestId("otp-input").fill("123456");
  await page.getByTestId("verify-otp").click();
  await expect(page.getByTestId("otp-status")).toHaveText(/verified|verify ho gaya/i);
}

/** Tick the mandatory boxes: declaration, venue rules and (studio services) recording consent. */
export async function acceptTerms(page: Page, { recording = false } = {}) {
  await page.getByTestId("consent-declaration").check();
  await page.getByTestId("consent-venue").check();
  if (recording) await page.getByTestId("consent-recording").check();
}

export async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByTestId("admin-name").fill("Asha (test)");
  await page.getByTestId("admin-password").fill("test-staff-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByTestId("readiness")).toBeVisible();
}

/** Books a podcast slot through the UI and returns the booking ID. */
export async function bookPodcast(page: Page, offset: number) {
  await page.goto("/book?package=podcast");
  await chooseDate(page, offset);
  await (await firstAvailableSlot(page)).click();
  await expect(page.getByTestId("hold-banner")).toBeVisible();
  await page.getByTestId("guest-count").selectOption("2");
  await fillDetailsAndVerify(page);
  await acceptTerms(page, { recording: true });
  await page.getByTestId("pay-button").click();
  await expect(page.getByTestId("booking-id")).toHaveText(/^TS-/);
  return (await page.getByTestId("booking-id").textContent())!.trim();
}

/** Adds a licensed title through the admin panel and returns its unique name. */
export async function addTitle(page: Page, runtimeMinutes: number) {
  await adminLogin(page);
  const name = `Test Title ${Date.now().toString(36)}`;
  await page.goto("/admin/titles");
  const form = page.getByTestId("title-form");
  await form.getByLabel("Title", { exact: true }).fill(name);
  await form.getByLabel("Runtime (minutes)").fill(String(runtimeMinutes));
  await form.getByLabel("Language").fill("Hindi");
  await form.getByLabel("Licence reference").fill("TEST-LIC-001");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Add title" }).click();
  await expect(form.getByRole("status")).toContainText(`Added ${name}`);
  return name;
}
