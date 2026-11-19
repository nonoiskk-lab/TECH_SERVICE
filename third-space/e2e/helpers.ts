import { expect, type Page, type TestInfo } from "@playwright/test";

export const isOpen = (info: TestInfo) => info.project.name === "gate-open";

/** Pick a date `offset` days after the first bookable date shown by the date input. */
export async function chooseDate(page: Page, offset: number) {
  const input = page.getByTestId("date-input");
  const min = await input.getAttribute("min");
  const d = new Date(`${min}T12:00:00+05:30`);
  d.setUTCDate(d.getUTCDate() + offset);
  const iso = d.toISOString().slice(0, 10);
  await input.fill(iso);
  await expect(page.locator('[data-testid="slot"]').first()).toBeVisible();
  return iso;
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
