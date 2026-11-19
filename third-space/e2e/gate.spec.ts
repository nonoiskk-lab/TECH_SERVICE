import { expect, test } from "@playwright/test";
import { acceptTerms, addTitle, chooseDate, fillDetailsAndVerify, firstAvailableSlot, isOpen } from "./helpers";

test.describe("Legal Gate closed", () => {
  test.beforeEach(({}, info) => test.skip(isOpen(info), "closed-gate only"));

  test("home says Podcast Studio is bookable; theatre is coming soon", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("gate-banner")).toContainText("Podcast Studio is bookable now");
    await expect(page.getByTestId("pick-watch")).toContainText("Coming soon");
    await expect(page.getByTestId("from-price")).toHaveText("₹713"); // lowest real price: 15-min podcast + 30-min setup at ₹950/hr
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
    expect((await request.get("/policies/theatre")).status()).toBe(404);
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
    await expect(page.getByTestId("from-price")).toHaveText("₹713"); // lowest real price: 15-min podcast + 30-min setup at ₹950/hr
    await page.goto("/watch");
    await expect(page.getByTestId("package-theatre-classic").getByTestId("package-price")).toHaveText("₹850/hr");
    await expect(page.getByTestId("package-theatre-premium").getByTestId("package-price")).toHaveText("₹1,350/hr");
    await expect(page.getByTestId("content-rule")).toBeVisible();
  });

  test("movie length decides theatre time and price; celebration books with a title", async ({ page }) => {
    const name = await addTitle(page, 120);
    await page.goto("/watch");
    // 120 min + 15 setup = 135 → rounded up to 2h 30m. Cinema ₹850/hr → ₹2,125; Premium ₹1,350/hr → ₹3,375.
    const card = page.getByTestId("title-list").locator("li", { hasText: name }).first();
    await expect(card).toContainText("2h 30m");
    await expect(card.getByTestId("title-price-theatre-classic")).toHaveText("₹2,125");
    await expect(card.getByTestId("title-price-theatre-premium")).toHaveText("₹3,375");
    await page.goto("/celebrate");
    const option = await page.getByTestId("title-select").locator("option", { hasText: name }).getAttribute("value");
    await page.getByTestId("title-select").selectOption(option!);
    await expect(page.getByTestId("session-summary")).toContainText("2h 30m");
    await page.getByLabel("Anniversary").check();
    await chooseDate(page, 5);
    await page.getByTestId("addon-fog-entry").check();
    await (await firstAvailableSlot(page)).click();
    await fillDetailsAndVerify(page);
    await expect(page.getByTestId("link-addendum")).toHaveAttribute("href", "/policies/theatre");
    await acceptTerms(page);
    await page.getByTestId("pay-button").click();
    await expect(page.getByTestId("booking-id")).toHaveText(/^TS-/);
  });
});
