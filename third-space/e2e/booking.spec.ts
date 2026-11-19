import { expect, test } from "@playwright/test";
import { chooseDate, fillDetailsAndVerify, firstAvailableSlot, isOpen } from "./helpers";

test("booking happy path: podcast, advance paid, booking ID shown", async ({ page }, info) => {
  await page.goto("/book?package=podcast-2h");
  await chooseDate(page, 1 + (isOpen(info) ? 10 : 0));
  await page.getByTestId("addon-extra-camera").check();
  await expect(page.getByTestId("quote-total")).toHaveText("₹2,830"); // (1899 + 499) * 1.18
  await expect(page.getByTestId("quote-advance")).toHaveText("₹1,415");
  await (await firstAvailableSlot(page)).click();
  await expect(page.getByTestId("hold-banner")).toBeVisible();
  await expect(page.getByTestId("hold-countdown")).toHaveText(/^1[45]:\d\d$/);
  await fillDetailsAndVerify(page);
  // Refund tiers and venue rules are visible before the pay button.
  await expect(page.getByTestId("refund-tiers")).toBeVisible();
  await expect(page.getByTestId("venue-rules")).toBeVisible();
  const pay = page.getByTestId("pay-button");
  await expect(pay).toBeDisabled();
  await page.getByTestId("consent-venue").check();
  await expect(pay).toBeDisabled(); // recording consent still missing
  await page.getByTestId("consent-recording").check();
  await expect(pay).toBeEnabled();
  await pay.click();
  await expect(page).toHaveURL(/\/book\/confirmation\/TS-/);
  await expect(page.getByTestId("booking-id")).toHaveText(/^TS-[A-Z0-9]{6}$/);
});

test("hold expiry releases the slot after 15 minutes", async ({ page }, info) => {
  await page.clock.install();
  await page.goto("/book?package=podcast-2h");
  await chooseDate(page, 2 + (isOpen(info) ? 10 : 0));
  const slot = await firstAvailableSlot(page);
  const start = await slot.getAttribute("data-start");
  await slot.click();
  await expect(page.getByTestId("hold-banner")).toBeVisible();
  await page.clock.fastForward("15:02");
  await expect(page.getByTestId("flow-error")).toContainText(/hold ran out|Hold ka time khatam/);
  await expect(page.getByTestId("hold-banner")).toBeHidden();
  await expect(page.locator(`[data-testid="slot"][data-start="${start}"]`)).toHaveAttribute("data-status", "available");
});

test("slot-taken error when someone else holds the slot first", async ({ page, request }, info) => {
  await page.goto("/book?package=podcast-2h");
  await chooseDate(page, 3 + (isOpen(info) ? 10 : 0));
  const slot = await firstAvailableSlot(page);
  const start = await slot.getAttribute("data-start");
  const r = await request.post("/api/holds", { data: { packageId: "podcast-2h", start } });
  expect(r.status()).toBe(201);
  await page.locator(`[data-testid="slot"][data-start="${start}"]`).click();
  await expect(page.getByTestId("flow-error")).toContainText(/just took that slot|kisi aur ne le liya/);
  await expect(page.locator(`[data-testid="slot"][data-start="${start}"]`)).toHaveAttribute("data-status", "held");
  await expect(page.getByTestId("hold-banner")).toBeHidden();
});

test("free visit books without payment", async ({ page }, info) => {
  await page.goto("/visit");
  await chooseDate(page, 4 + (isOpen(info) ? 10 : 0));
  await (await firstAvailableSlot(page)).click();
  await fillDetailsAndVerify(page);
  await page.getByTestId("consent-venue").check();
  await expect(page.getByTestId("pay-button")).toHaveText(/free visit|Free visit/i);
  await page.getByTestId("pay-button").click();
  await expect(page.getByTestId("booking-id")).toHaveText(/^TS-/);
});
