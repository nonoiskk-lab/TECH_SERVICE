import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { isOpen } from "./helpers";

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
