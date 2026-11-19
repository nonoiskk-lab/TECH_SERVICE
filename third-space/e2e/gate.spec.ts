import { expect, test } from "@playwright/test";
import { acceptTerms, addTitle, chooseDate, fillDetailsAndVerify, firstAvailableSlot, isOpen } from "./helpers";

test.describe("Legal Gate closed", () => {
  test.beforeEach(({}, info) => test.skip(isOpen(info), "closed-gate only"));

  test("home says Podcast Studio is bookable; theatre is coming soon", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("gate-banner")).toContainText("Podcast Studio is bookable now");
    await expect(page.getByTestId("pick-watch")).toContainText("Coming soon");
    await expect(page.getByTestId("from-price")).toHaveText("₹799"); // minimum booking price
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

  test("celebrations stay bookable without any screening", async ({ page }) => {
    await page.goto("/celebrate");
    await expect(page.getByTestId("booking-flow")).toBeVisible();
    await expect(page.getByTestId("title-select")).toHaveCount(0);
    await expect(page.getByTestId("price-list")).toHaveCount(0); // price list lives on the home page
    await page.goto("/");
    const list = page.getByTestId("price-list");
    await expect(list).toContainText("Podcast Studio / Content Creation – 2 hours");
    await expect(list).toContainText("₹2,499+");
    await expect(list).toContainText("Small Private Celebration – 1 hour");
    await expect(list).not.toContainText("Private Cinema");
    await expect(list).not.toContainText("Family Package");
  });
});

test.describe("Legal Gate open", () => {
  test.beforeEach(({}, info) => test.skip(!isOpen(info), "open-gate only"));

  test("theatre appears normally with prices and content rule", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("gate-banner")).toHaveCount(0);
    await expect(page.getByTestId("from-price")).toHaveText("₹799"); // minimum booking price
    await page.goto("/watch");
    await expect(page.getByTestId("package-theatre-classic").getByTestId("package-price")).toHaveText("₹1,699");
    await expect(page.getByTestId("package-theatre-premium").getByTestId("package-price")).toHaveText("₹2,699");
    await expect(page.getByTestId("package-family").getByTestId("package-price")).toHaveText("₹6,999");
    await page.goto("/");
    const list = page.getByTestId("price-list");
    for (const [label, price] of [
      ["Private Cinema – 2 hours (max 5 people)", "₹1,699"],
      ["Premium Experience – 2 hours (max 4 people)", "₹2,699"],
      ["Podcast Studio / Content Creation – 2 hours", "₹1,899"],
      ["Birthday / Anniversary Experience – 2 hours", "₹2,499+"],
      ["Family Package – 3 hours (max 5 people)", "₹6,999"],
      ["Small Private Celebration – 1 hour", "₹799"],
      ["Monthly Creator Plan", "₹4,999"],
    ]) {
      await expect(list.locator("tr", { hasText: label })).toContainText(price);
    }
    await page.goto("/watch");
    await expect(page.getByTestId("content-rule")).toBeVisible();
  });

  test("movie length decides theatre time and price; theatre books with a title", async ({ page }) => {
    const name = await addTitle(page, 120);
    await page.goto("/watch");
    // 120 min + 30 setup = 2h 30m. Cinema ₹850/hr → ₹2,125; Premium ₹1,350/hr → ₹3,375 (both above their starting prices).
    const card = page.getByTestId("title-list").locator("li", { hasText: name }).first();
    await expect(card).toContainText("2h 30m");
    await expect(card.getByTestId("title-price-theatre-classic")).toHaveText("₹2,125");
    await expect(card.getByTestId("title-price-theatre-premium")).toHaveText("₹3,375");
    await page.goto("/book?package=theatre-classic");
    const option = await page.getByTestId("title-select").locator("option", { hasText: name }).getAttribute("value");
    await page.getByTestId("title-select").selectOption(option!);
    await expect(page.getByTestId("session-summary")).toContainText("2h 30m");
    await chooseDate(page, 5);
    await page.getByTestId("addon-cake").check();
    await (await firstAvailableSlot(page)).click();
    await fillDetailsAndVerify(page);
    await expect(page.getByTestId("link-addendum")).toHaveAttribute("href", "/policies/theatre");
    await acceptTerms(page);
    await page.getByTestId("pay-button").click();
    await expect(page.getByTestId("booking-id")).toHaveText(/^TS-/);
  });
});
