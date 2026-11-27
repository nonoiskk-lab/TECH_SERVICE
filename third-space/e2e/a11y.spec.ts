import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { adminLogin, isOpen } from "./helpers";

test.beforeEach(({}, info) => test.skip(isOpen(info), "runs once, on the gate-closed server"));

// Automated WCAG 2.1 A/AA checks. They find roughly a third of real accessibility problems:
// they do not replace a manual keyboard and screen-reader review (see docs/TESTING_REPORT.md).
const PAGES = ["/", "/pricing", "/podcast-studio", "/celebrations", "/book?package=podcast", "/faqs", "/contact", "/terms", "/account/login", "/account/forgot", "/my-booking"];

for (const path of PAGES) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(
      bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target?.join(" ")} — ${v.help}`),
    ).toEqual([]);
  });
}

async function axeSerious(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target?.join(" ")}`);
}

// The light staff and admin theme gets the same checks as the dark customer theme.
test("no serious accessibility violations on the light staff and admin screens", async ({ page }) => {
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  expect(await axeSerious(page), "/admin/login").toEqual([]);
  await adminLogin(page);
  for (const path of ["/admin", "/staff", "/staff/checklist", "/admin/bookings", "/admin/bookings/new", "/admin/slots", "/admin/memberships"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    expect(await axeSerious(page), path).toEqual([]);
  }
});

test("no serious accessibility violations on the signed-in account page (tab bar, plan, payments)", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/account/signup");
  const f = page.getByTestId("account-signup");
  await f.getByTestId("signup-name").fill("A11y Guest");
  await f.getByTestId("signup-phone").fill(`96${String(stamp).slice(-8)}`);
  await f.getByTestId("signup-email").fill(`a11y-${stamp}@thirdspace.in`);
  await f.getByTestId("signup-password").fill("a11y-pass-12345");
  await f.getByTestId("signup-age").check();
  await f.getByRole("button").click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByTestId("tab-bar")).toBeVisible();
  expect(await axeSerious(page), "/account").toEqual([]);
});
