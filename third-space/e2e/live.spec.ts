import { expect, test } from "@playwright/test";
import { acceptTerms, chooseDate, firstAvailableSlot } from "./helpers";

test("live site without payment keys: no fake payment, no test OTP, pay at venue", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#steps")).toContainText("Confirm your booking");
  await expect(page.locator("#steps")).not.toContainText("Pay the advance");
  await expect(page.locator("#faq")).toContainText("Nothing online");
  await page.goto("/policies");
  await expect(page.getByTestId("venue-policy-note")).toBeVisible();
  await page.goto("/book?package=podcast");
  await expect(page.getByText(/Test mode/)).toHaveCount(0);
  await chooseDate(page, 2);
  await expect(page.getByTestId("pay-at-venue")).toContainText("₹2,241"); // 1,899 + 18% GST
  await expect(page.getByTestId("quote-advance")).toHaveCount(0);
  await (await firstAvailableSlot(page)).click();
  await page.getByTestId("guest-name").fill("Live Guest");
  await page.getByTestId("guest-email").fill("live@thirdspace.in");
  await page.getByTestId("guest-phone").fill("9876511111");
  await expect(page.getByTestId("send-otp")).toHaveCount(0);
  await expect(page.getByTestId("venue-note")).toBeVisible();
  await expect(page.getByTestId("refund-tiers")).toHaveCount(0);
  await acceptTerms(page, { recording: true });
  await expect(page.getByTestId("pay-button")).toHaveText("Confirm booking · pay ₹2,241 at venue");
  await page.getByTestId("pay-button").click();
  await expect(page.getByTestId("booking-id")).toHaveText(/^TS-/);
  await expect(page.getByText("₹0", { exact: true })).toBeVisible();
});
