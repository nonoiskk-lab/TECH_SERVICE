import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseDate, firstAvailableSlot, isOpen } from "./helpers";

test.beforeEach(({}, info) => test.skip(isOpen(info), "runs once, on the gate-closed server"));

const lum = (rgb: number[]) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const rgbOf = (css: string) => (css.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);

test("design tokens: one tokens file, semantic names, radius scale, UI borders and focus ring meet 3:1", async ({ page }) => {
  await page.goto("/account/login");
  const t = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const input = getComputedStyle(document.querySelector(".ts-input")!);
    const btn = document.createElement("a");
    btn.className = "ts-btn ts-btn-primary";
    document.body.appendChild(btn);
    const b = getComputedStyle(btn);
    return {
      background: root.getPropertyValue("--background").trim(),
      primary: root.getPropertyValue("--primary").trim(),
      border: root.getPropertyValue("--border").trim(),
      radius: root.getPropertyValue("--radius").trim(),
      ring: root.getPropertyValue("--ring").trim(),
      inputBorder: input.borderTopColor,
      inputBg: input.backgroundColor,
      inputRadius: input.borderTopLeftRadius,
      btnRadius: b.borderTopLeftRadius,
      btnBg: b.backgroundColor,
      btnColor: b.color,
    };
  });
  for (const k of ["background", "primary", "border", "radius", "ring"]) expect(t[k as keyof typeof t], `--${k}`).not.toBe("");
  expect(ratio(rgbOf(t.inputBorder), rgbOf(t.inputBg)), "input border vs its background").toBeGreaterThanOrEqual(3);
  expect(parseFloat(t.btnRadius)).toBeGreaterThanOrEqual(999 / 2); // pill (a huge radius computes to the full value)
  expect(parseFloat(t.inputRadius)).toBe(12);
  // The primary button: dark text on gold, never white (white on gold is 2.55:1).
  expect(ratio(rgbOf(t.btnColor), rgbOf(t.btnBg)), "primary button text").toBeGreaterThanOrEqual(7);
});

test("booking: price and cancellation rules show before a time is chosen (English and Hinglish)", async ({ page, context, baseURL }) => {
  await page.goto("/book?package=podcast");
  const glance = page.getByTestId("policy-glance");
  await expect(glance).toBeVisible();
  await expect(glance).toContainText("Before you choose a time");
  await expect(glance).toContainText("%");
  await expect(page.getByTestId("session-summary")).toContainText("₹"); // price is already shown at the session step

  await context.addCookies([{ name: "ts_lang", value: "hi", url: baseURL! }]);
  await page.goto("/book?package=podcast");
  await expect(page.getByTestId("policy-glance")).toContainText("Time chunne se pehle");
});

test("booking on a phone: one sticky primary action that gives way to the pay button", async ({ page }) => {
  await page.goto("/book?package=podcast");
  await expect(page.getByTestId("sticky-cta")).toHaveCount(0); // nothing sticky before a slot is held
  await chooseDate(page, 21);
  await (await firstAvailableSlot(page)).click();
  await expect(page.getByTestId("hold-banner")).toBeVisible();

  const bar = page.getByTestId("sticky-cta");
  await expect(bar).toBeVisible();
  await expect(bar).toContainText("Review and pay");
  await expect(bar).toContainText("₹");

  // Selected slot chip keeps AA contrast (dark brown on gold-brown failed at 3.7:1).
  const axe = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`)).toEqual([]);

  await page.getByTestId("sticky-cta-button").click();
  await expect(page.locator("#checkout")).toBeInViewport(); // the button takes the guest to the review and pay section
  await expect(bar).toHaveCount(0); // that section is on screen, so only its own primary button remains
  await page.getByTestId("pay-button").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("pay-button")).toBeVisible();
  await expect(bar).toHaveCount(0);

  // Desktop: the summary column is already sticky, so the bar never shows.
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByTestId("sticky-cta")).toBeHidden();
});
