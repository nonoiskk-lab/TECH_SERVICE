import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { adminLogin, bookPodcast, isOpen } from "./helpers";

const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL ?? "postgresql://thirdspace:thirdspace@localhost:5432/thirdspace_test" } } });
test.afterAll(async () => { await db.$disconnect(); });
test.beforeEach(({}, info) => test.skip(isOpen(info), "runs once, on the gate-closed server"));

const istDay = (offsetDays = 0) => new Date(Date.now() + 330 * 60_000 + offsetDays * 86400_000).toISOString().slice(0, 10);

test("staff dashboard (light theme): three-lane day calendar with a booking block in its mode lane, and stat cards", async ({ page }) => {
  const id = await bookPodcast(page, 9);
  await adminLogin(page);
  const b = await db.booking.findUniqueOrThrow({ where: { id } });
  const day = new Date(b.start.getTime() + 330 * 60_000).toISOString().slice(0, 10);
  await page.goto(`/admin?date=${day}`);

  // Orange and white: the staff screens sit on white.
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector(".theme-light")!).backgroundColor);
  expect(bg).toBe("rgb(255, 255, 255)");

  for (const lane of ["theatre", "podcast", "studio"]) await expect(page.getByTestId(`lane-title-${lane}`)).toBeVisible();
  const block = page.getByTestId("lane-podcast").locator(`[data-testid="booking-block"][href="/admin/bookings/${id}"]`);
  await expect(block).toBeVisible();
  await expect(page.getByTestId("lane-theatre").locator(`[href="/admin/bookings/${id}"]`)).toHaveCount(0);
  const h = await block.evaluate((el) => (el as HTMLElement).offsetHeight);
  expect(h).toBeGreaterThanOrEqual(48); // a session is at least an hour tall on the calendar

  expect(Number(await page.getByTestId("stat-bookings").innerText())).toBeGreaterThanOrEqual(1);
  // Other specs book the same day, so open this booking's own block by its link.
  await page.locator(`[data-testid="booking-block"][href="/admin/bookings/${id}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/admin/bookings/${id}`));
});

test("daily checklist: tick, undo, close the day, save the report note; past days are read only", async ({ page }) => {
  await db.setting.deleteMany({ where: { key: `checklist:${istDay()}` } }); // rerunnable
  await adminLogin(page);
  await page.goto("/staff/checklist");
  await expect(page.getByTestId("checklist-state")).toContainText("0 of 5");

  const item = (id: string) => page.locator(`[data-testid="checklist-item"][data-item="${id}"]`);
  await page.getByTestId("toggle-projector_audio").click();
  await expect(item("projector_audio")).toHaveAttribute("data-done", "true");
  await expect(item("projector_audio")).toContainText("Done by Asha (test)");
  await page.reload();
  await expect(item("projector_audio")).toHaveAttribute("data-done", "true"); // stored

  await page.getByTestId("toggle-projector_audio").click(); // Undo
  await expect(item("projector_audio")).toHaveAttribute("data-done", "false");

  for (const id of ["projector_audio", "mic_camera", "sanitization", "recordings", "closing"]) {
    await page.getByTestId(`toggle-${id}`).click();
    await expect(item(id)).toHaveAttribute("data-done", "true");
  }
  await expect(page.getByTestId("checklist-state")).toContainText("Day closed");

  await page.getByTestId("report-note").fill("Projector lamp at 80 percent.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("report-note-form").getByRole("status")).toContainText("Saved");
  await page.reload();
  await expect(page.getByTestId("report-note")).toHaveValue("Projector lamp at 80 percent.");
  expect(await db.auditLog.count({ where: { entityId: istDay(), action: { in: ["checklist.done", "checklist.undone", "checklist.note"] } } })).toBeGreaterThanOrEqual(7);

  // Yesterday is read only: no buttons, and a forged date in the URL cannot reach the future.
  await page.goto(`/staff/checklist?date=${istDay(-1)}`);
  await expect(page.getByText("(read only)")).toBeVisible();
  await expect(page.locator('[data-testid^="toggle-"]')).toHaveCount(0);
  await page.goto(`/staff/checklist?date=${istDay(5)}`);
  await expect(page.getByTestId("checklist-state")).toBeVisible();
  await expect(page.locator('[data-testid^="toggle-"]')).toHaveCount(5); // falls back to today, editable
});

test("daily checklist needs a staff login", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/staff/checklist");
  await expect(page).toHaveURL(/\/admin\/login/);
});
