import { expect, test } from "@playwright/test";
import { adminLogin, isOpen } from "./helpers";

test.beforeEach(({}, info) => test.skip(isOpen(info), "runs once, on the gate-closed server"));

// The other specs run at 390 px. These check the five other widths named in the requirements
// (360, 768, 1024, 1280, 1440): no sideways scrolling and no clipped primary actions.
const WIDTHS = [360, 768, 1024, 1280, 1440];
const PAGES = ["/", "/pricing", "/podcast-studio", "/celebrations", "/book?package=podcast", "/faqs", "/contact", "/account/login", "/my-booking"];

for (const width of WIDTHS) {
  test(`no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const wide: string[] = [];
    for (const path of PAGES) {
      await page.goto(path, { waitUntil: "load" });
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (over > 1) wide.push(`${path} (+${over}px)`);
    }
    expect(wide).toEqual([]);
  });
}

test("primary booking button is visible and tappable at 360 px and 1440 px", async ({ page }) => {
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const cta = page.getByTestId("hero-book");
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  }
});

// Staff and admin screens are used on phones too (the staff portal especially): no sideways scrolling.
for (const width of [360, 390, 768, 1280]) {
  test(`staff and admin screens have no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await adminLogin(page);
    const wide: string[] = [];
    for (const path of ["/staff", "/staff/checklist", "/admin", "/admin/bookings", "/admin/slots", "/admin/bookings/new", "/admin/memberships"]) {
      await page.goto(path, { waitUntil: "load" });
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (over > 1) wide.push(`${path} (+${over}px)`);
    }
    expect(wide).toEqual([]);
  });
}
