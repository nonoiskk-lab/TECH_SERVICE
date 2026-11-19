import { expect, test } from "@playwright/test";

test("Hinglish toggle switches copy and persists", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-IN");
  await page.getByTestId("locale-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi-Latn");
  await expect(page.getByRole("heading", { name: "Apna experience chuniye" })).toBeVisible();
  await page.goto("/policies");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rules aur Policies");
  await page.getByTestId("locale-toggle").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rules & Policies");
});

test("enquiry form creates a lead", async ({ page }) => {
  await page.goto("/contact?utm_source=instagram&utm_campaign=launch");
  await page.getByTestId("enquiry-purpose").selectOption("corporate");
  await page.getByTestId("enquiry-name").fill("Test Guest");
  await page.getByTestId("enquiry-phone").fill("9876543210");
  await page.getByTestId("enquiry-message").fill("Team offsite for 4 people");
  await page.getByTestId("enquiry-submit").click();
  await expect(page.getByTestId("enquiry-success")).toBeVisible();
  const cookies = await page.context().cookies();
  const ft = cookies.find((c) => c.name === "ts_ft");
  expect(decodeURIComponent(ft!.value)).toContain("instagram");
});

test("WhatsApp button opens wa.me with prefilled text", async ({ page }) => {
  await page.goto("/");
  const href = await page.getByTestId("whatsapp-float").getAttribute("href");
  expect(href).toMatch(/^https:\/\/wa\.me\/919031627292\?text=/);
});

test("no horizontal scroll and 44px tap targets on key pages", async ({ page }) => {
  for (const path of ["/", "/create", "/book", "/contact"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} overflows`).toBeLessThanOrEqual(0);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("main a.ts-btn, main button")]
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height < 44).length,
    );
    expect(small, `${path} has buttons under 44px`).toBe(0);
  }
});
