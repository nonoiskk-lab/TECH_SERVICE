import { expect, test } from "@playwright/test";
import { chooseDate, fillDetailsAndVerify, firstAvailableSlot, isOpen } from "./helpers";

test.describe("Legal Gate closed", () => {
  test.beforeEach(({}, info) => test.skip(isOpen(info), "closed-gate only"));

  test("home says Podcast Studio is bookable; theatre is coming soon", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("gate-banner")).toContainText("Podcast Studio is bookable now");
    await expect(page.getByTestId("pick-watch")).toContainText("Coming soon");
    await expect(page.getByTestId("from-price")).toHaveText("₹1,899");
  });

  test("watch page shows coming soon, no packages, noindex", async ({ page }) => {
    await page.goto("/watch");
    await expect(page.getByTestId("watch-closed")).toBeVisible();
    await expect(page.locator('[data-testid^="package-theatre"]')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const html = await page.content();
    expect(html).not.toMatch(/\b(film|movie|screening|cinema)s?\b/i);
  });

  test("theatre cannot be booked through the API or the SEO page", async ({ request }) => {
    expect((await request.get("/api/availability?date=2026-12-01&packageId=theatre-classic")).status()).toBe(404);
    expect((await request.post("/api/holds", { data: { packageId: "theatre-premium", start: "2026-12-01T18:00:00+05:30" } })).status()).toBe(400);
    expect((await request.get("/private-theatre-in-dhanbad")).status()).toBe(404);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain("/watch");
    expect(sitemap).not.toContain("theatre");
  });

  test("celebrate offers only the quote path", async ({ page }) => {
    await page.goto("/celebrate");
    await expect(page.getByTestId("celebrate-closed")).toBeVisible();
    await expect(page.getByTestId("booking-flow")).toHaveCount(0);
  });
});

test.describe("Legal Gate open", () => {
  test.beforeEach(({}, info) => test.skip(!isOpen(info), "open-gate only"));

  test("theatre appears normally with prices and content rule", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("gate-banner")).toHaveCount(0);
    await expect(page.getByTestId("from-price")).toHaveText("₹1,699");
    await page.goto("/watch");
    await expect(page.getByTestId("package-theatre-classic").getByTestId("package-price")).toHaveText("₹1,699");
    await expect(page.getByTestId("package-theatre-premium").getByTestId("package-price")).toHaveText("₹2,699");
    await expect(page.getByTestId("content-rule")).toBeVisible();
  });

  test("celebration booking with theme and add-ons", async ({ page }) => {
    await page.goto("/celebrate");
    await page.getByLabel("Anniversary").check();
    await chooseDate(page, 5);
    await page.getByTestId("addon-fog-entry").check();
    await (await firstAvailableSlot(page)).click();
    await fillDetailsAndVerify(page);
    await page.getByTestId("consent-venue").check();
    await page.getByTestId("pay-button").click();
    await expect(page.getByTestId("booking-id")).toHaveText(/^TS-/);
  });
});
