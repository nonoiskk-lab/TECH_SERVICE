import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { adminLogin, bookPodcast, isOpen } from "./helpers";

const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL ?? "postgresql://thirdspace:thirdspace@localhost:5432/thirdspace_test" } } });
test.afterAll(async () => { await db.$disconnect(); });
test.beforeEach(({}, info) => test.skip(isOpen(info), "runs once, on the gate-closed server"));

test("staff portal: assigned booking, room ready, check-in, notes, issue, complete; role limits", async ({ page }) => {
  const stamp = Date.now().toString(36);
  const email = `ops${stamp}@thirdspace.in`;
  const password = "ops-staff-pass-1";

  // 1. A guest books and pays (test mode); admin creates a staff account and assigns the booking.
  const bookingId = await bookPodcast(page, 40);
  await adminLogin(page);
  await page.goto("/admin/staff");
  const f = page.locator("form").filter({ has: page.getByRole("button", { name: "Save account" }) });
  await f.getByLabel("Name").fill("Ops Staff");
  await f.getByLabel("Email (login)").fill(email);
  await f.getByLabel("Role").selectOption("staff");
  await f.getByLabel(/Password/).fill(password);
  await f.getByRole("button", { name: "Save account" }).click();
  await expect(f.getByRole("status")).toContainText(`Saved ${email}`);

  await page.goto(`/admin/bookings/${bookingId}`);
  await page.getByTestId("assign-form").getByLabel("Runs this booking").selectOption({ label: "Ops Staff" });
  await page.getByTestId("assign-form").getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("assign-form").getByRole("status")).toContainText("Assigned");

  // 2. Staff log in and land in the staff portal.
  await page.context().clearCookies();
  await page.goto("/admin/login");
  await page.getByTestId("admin-name").fill(email);
  await page.getByTestId("admin-password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/staff$/);

  // 3. "My bookings" on the booking's day shows it; a stranger's day does not.
  const b = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
  const day = new Date(b.start.getTime() + 330 * 60_000).toISOString().slice(0, 10);
  await page.goto(`/staff?date=${day}&view=mine`);
  const row = page.getByTestId("staff-row").filter({ hasText: "Assigned to Ops Staff" });
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(page.getByTestId("staff-booking")).toContainText("2"); // guest count from the booking
  await expect(page.getByTestId("staff-booking")).not.toContainText("@"); // no email shown to staff

  // 4. Room ready, check-in needs the ID confirmation, start, note, issue, complete.
  await page.getByTestId("mark-room-ready").click();
  await expect(page.getByTestId("room-ready")).toContainText("Ops Staff");
  const ci = page.getByTestId("staff-checkin");
  await ci.getByRole("button", { name: "Check in" }).click();
  await expect(ci.getByRole("alert")).toContainText(/photo ID/i);
  await ci.getByRole("checkbox").check();
  await ci.getByRole("button", { name: "Check in" }).click();
  await expect(page.getByTestId("staff-booking")).toContainText("checked in");

  await page.getByTestId("progress-in_progress").click();
  await expect(page.getByTestId("staff-booking")).toContainText("in progress");
  await expect(page.getByTestId("progress-no_show")).toHaveCount(0); // not offered mid-session

  const notes = page.getByTestId("staff-notes");
  await notes.getByTestId("note-input").fill("Projector warmed up");
  await notes.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByTestId("notes-log")).toContainText("Ops Staff: Projector warmed up");

  const issue = page.getByTestId("staff-issue");
  await issue.getByRole("button", { name: "Report to manager" }).click();
  await expect(issue.getByRole("alert")).toContainText(/10 to 2000/);
  await issue.getByTestId("issue-description").fill("Microphone cable frayed at the stand.");
  await issue.getByRole("button", { name: "Report to manager" }).click();
  await expect(issue.getByRole("status")).toContainText("reported");
  expect(await db.incident.count({ where: { bookingId, reportedBy: "Ops Staff", status: "open" } })).toBe(1);

  await page.getByTestId("progress-completed").click();
  await expect(page.getByTestId("staff-booking")).toContainText("completed");
  await expect(page.getByTestId("progress-completed")).toHaveCount(0);

  // 5. Staff cannot use manager or finance areas.
  for (const path of ["/admin/payments", "/admin/staff", "/admin/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/denied=/);
  }
  // Final state in the database.
  const after = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
  expect(after.assignedStaffId).toBeTruthy();
  expect(after.status).toBe("completed");
});

test("staff portal needs a staff login", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/staff");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/staff/does-not-exist");
  await expect(page).toHaveURL(/\/admin\/login/);
});
