import { expect, test } from "@playwright/test";

test("podcast time follows episodes; creator time follows reels; space is ₹799/hr", async ({ page }) => {
  await page.goto("/book?package=podcast");
  await page.getByTestId("episode-length").selectOption("45");
  await page.getByTestId("episodes").selectOption("3");
  // 3 × 45 = 135 + 30 setup = 165 → 3h. 3 × ₹950 = ₹2,850.
  await expect(page.getByTestId("session-summary")).toContainText("3h");
  await expect(page.getByTestId("session-summary")).toContainText("₹2,850");

  await page.getByLabel(/Creator Studio Shoot/).check();
  await page.getByTestId("reels").selectOption("4");
  await page.getByTestId("long-videos").selectOption("1");
  // 4 × 15 + 1 × 30 + 30 setup = 120 → 2h at ₹950/hr = ₹1,900.
  await expect(page.getByTestId("session-summary")).toContainText("2h");
  await expect(page.getByTestId("session-summary")).toContainText("₹1,900");
  await page.getByTestId("reels").selectOption("0");
  await page.getByTestId("long-videos").selectOption("0");
  await expect(page.getByText("Pick at least one reel or video.")).toBeVisible();

  await page.getByLabel(/Studio Space Only/).check();
  await page.getByTestId("hours").selectOption("3");
  await expect(page.getByTestId("session-summary")).toContainText("₹2,397");
  await expect(page.getByTestId("quote-total")).toHaveText("₹2,828"); // 2,397 + 18% GST
});

test("changing the session after holding a slot releases the hold", async ({ page }) => {
  await page.goto("/book?package=podcast");
  const input = page.getByTestId("date-input");
  const min = await input.getAttribute("min");
  const d = new Date(`${min}T12:00:00+05:30`);
  d.setUTCDate(d.getUTCDate() + 20);
  await input.fill(d.toISOString().slice(0, 10));
  await page.locator('[data-testid="slot"][data-status="available"]').first().click();
  await expect(page.getByTestId("hold-banner")).toBeVisible();
  await page.getByTestId("episodes").selectOption("2");
  await expect(page.getByTestId("hold-banner")).toBeHidden();
});

test("server prices the session itself and rejects a mismatched hold", async ({ request }) => {
  const day = new Date(Date.now() + 50 * 86400_000).toISOString().slice(0, 10);
  const slots = (await (await request.get(`/api/availability?date=${day}&packageId=podcast&duration=60`)).json()).slots as { start: string; status: string }[];
  const start = slots.find((s) => s.status === "available")!.start;
  const hold = await (await request.post("/api/holds", { data: { packageId: "podcast", start, durationMinutes: 60 } })).json();
  await request.post("/api/otp", { data: { action: "send", phone: "9876500002" } });
  await request.post("/api/otp", { data: { action: "verify", phone: "9876500002", code: "123456" } });
  const r = await request.post("/api/checkout", {
    data: {
      holdId: hold.id,
      packageId: "podcast",
      mode: "create",
      addOnIds: [],
      guestCount: 1,
      locale: "en",
      session: { episodeMinutes: 60, episodes: 2 }, // needs 2h 30m, hold is 1h
      guest: { name: "Mismatch", phone: "9876500002", email: "m@thirdspace.in" },
      consent: { declaration: true, venue: true, recording: true },
    },
  });
  expect(r.status()).toBe(409);
  expect((await request.post("/api/holds", { data: { packageId: "podcast", start, durationMinutes: 45 } })).status()).toBe(400);
});
