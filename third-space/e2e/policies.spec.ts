import { expect, test } from "@playwright/test";
import { isOpen } from "./helpers";

test("policy pages show version 2.0, the full master policy and each addendum", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByTestId("adults-only")).toHaveText("18+ only");
  await page.goto("/policies");
  await expect(page.getByTestId("policy-version").first()).toContainText("Version 2.0");
  await expect(page.getByTestId("easy-summary")).toContainText("Strict 18+ venue");
  await page.goto("/policies/safety");
  for (const h of ["1. Adult-only entry", "2. No nudity", "3. No smoking", "4. No violence", "5. Religion", "6. Indian law", "7. Customer responsibility", "8. Immediate safety", "9. Recording, CCTV", "10. Booking acceptance", "11. Updates"]) {
    await expect(page.getByRole("heading", { name: new RegExp(h) })).toBeVisible();
  }
  await page.goto("/policies/podcast");
  await expect(page.getByTestId("policy-podcast")).toContainText("Guest recording consent and THIRD SPACE promotional consent are separate");
  await page.goto("/policies/creator");
  await expect(page.getByTestId("policy-creator")).toContainText("No nude shoots");
  const theatre = await page.request.get("/policies/theatre");
  expect(theatre.status()).toBe(isOpen(info) ? 200 : 404);
});
