import { expect, test } from "@playwright/test";

test.describe("brand assets", () => {
  test("icons, apple icon, share image and manifest are served", async ({ request }) => {
    for (const path of ["/icon-192.png", "/icon-512.png", "/icon-512-maskable.png", "/brand/logo-mark.svg", "/brand/logo-mark-white.svg", "/brand/logo-mark-ink.svg", "/brand/logo-mark-on-orange.svg"]) {
      const r = await request.get(path);
      expect(r.status(), path).toBe(200);
    }
    const og = await request.get("/opengraph-image");
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"]).toContain("image/png");
    const apple = await request.get("/apple-icon.png");
    expect(apple.status()).toBe(200);
    const m = await (await request.get("/manifest.webmanifest")).json();
    expect(m.background_color).toBe("#FFFFFF");
    expect(m.theme_color).toBe("#FF7A1A");
    expect(m.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  });

  test("head links the icons and the share image", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
  });

  test("service cards show a cover and a mode badge, without layout overflow", async ({ page }) => {
    await page.goto("/");
    const cards = page.getByTestId("service-card");
    await expect(cards).toHaveCount(3);
    await expect(page.getByTestId("service-cover")).toHaveCount(3);
    await expect(page.getByTestId("mode-badge")).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("404 page shows the illustration and a way home", async ({ page }) => {
    const res = await page.goto("/no-such-page-xyz");
    expect(res?.status()).toBe(404);
    await expect(page.getByTestId("art-404")).toBeVisible();
    await expect(page.getByRole("link", { name: /home/i }).first()).toBeVisible();
  });
});
