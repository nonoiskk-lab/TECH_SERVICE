import { expect, test } from "@playwright/test";
import { adminLogin, bookPodcast, isOpen } from "./helpers";

test.describe("Booking software (admin)", () => {
  test.beforeEach(({}, info) => test.skip(isOpen(info), "admin flows run once, on the gate-closed server"));

  test("admin needs a login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.getByTestId("admin-name").fill("Intruder");
    await page.getByTestId("admin-password").fill("wrong");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByTestId("admin-login").getByRole("alert")).toHaveText("Wrong password.");
  });

  test("check-in records only '18+ verified', balance, and the acceptance record", async ({ page }) => {
    const id = await bookPodcast(page, 6);
    await adminLogin(page);
    await page.goto(`/admin/bookings/${id}`);
    await expect(page.getByTestId("acceptance")).toContainText("Mandatory Customer Declaration");
    await expect(page.getByTestId("acceptance")).toContainText("Policy pack version: 2.0");
    // Check-in refuses without the ID confirmation.
    await page.getByTestId("checkin").getByRole("button", { name: "Check in" }).click();
    await expect(page.getByTestId("checkin").getByRole("alert")).toContainText("photo ID");
    await page.getByTestId("age-count").fill("2");
    await page.getByTestId("id-seen").check();
    await page.getByTestId("checkin").getByRole("button", { name: "Check in" }).click();
    await expect(page.getByTestId("age-state")).toHaveText(/18\+ verified for 2 of 2/);
    await page.getByTestId("balance-paid").click();
    await expect(page.getByTestId("balance-state")).toContainText("paid");
    await page.goto(`/admin/audit?q=${id}`);
    await expect(page.getByTestId("audit-rows")).toContainText("booking.checked_in");
    await expect(page.getByTestId("audit-rows")).toContainText("booking.balance_paid");
    await expect(page.getByTestId("audit-rows")).not.toContainText("9876543210");
  });

  test("stop session opens an incident; incident register keeps updates", async ({ page }) => {
    const id = await bookPodcast(page, 7);
    await adminLogin(page);
    await page.goto(`/admin/bookings/${id}`);
    const stop = page.getByTestId("stop");
    await stop.getByRole("combobox").first().selectOption("prohibited_item");
    await stop.locator("textarea").fill("Guest lit a cigarette in the studio after a reminder.");
    await stop.getByRole("button", { name: /Stop session/ }).click();
    await expect(page.getByTestId("incident-record")).toContainText("Session stopped");
    await expect(page.getByTestId("incident-record")).toContainText(id);
    await page.getByLabel("Note (appended, never overwritten)").fill("CCTV clip saved.");
    await page.getByLabel("Evidence preserved").check();
    await page.getByRole("button", { name: "Save update" }).click();
    await expect(page.getByTestId("incident-record")).toContainText("CCTV clip saved.");
    await page.goto(`/admin/bookings/${id}`);
    await expect(page.getByText("stopped", { exact: true }).first()).toBeVisible();
  });

  test("blocking time removes those slots from the public booking page", async ({ page, request }) => {
    await adminLogin(page);
    const day = new Date(Date.now() + 45 * 86400_000).toISOString().slice(0, 10);
    await page.goto(`/admin/slots?date=${day}`);
    const form = page.getByTestId("block-form");
    await form.getByLabel("Space").selectOption("studio");
    await form.getByLabel("From").fill("10:00");
    await form.getByLabel("To").fill("14:00");
    await form.getByLabel("Reason").fill("Deep clean");
    await form.getByRole("button", { name: "Block" }).click();
    await expect(form.getByRole("status")).toContainText("Blocked");
    const slots = (await (await request.get(`/api/availability?date=${day}&packageId=podcast-2h`)).json()).slots as { start: string; status: string }[];
    expect(slots.find((s) => s.start.includes("T10:00"))!.status).toBe("blocked");
    expect(slots.find((s) => s.start.includes("T14:30"))!.status).toBe("available");
  });

  test("confirmation messages are queued for staff to send", async ({ page }) => {
    const id = await bookPodcast(page, 8);
    await adminLogin(page);
    await page.goto("/admin/notifications");
    await expect(page.getByTestId("notification-rows")).toContainText(id);
  });
});
