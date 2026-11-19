import { expect, test } from "@playwright/test";
import { chooseDate } from "./helpers";

test("podcast time follows episodes; creator time follows reels; space is ₹799/hr", async ({ page }) => {
  await page.goto("/book?package=podcast");
  await page.getByTestId("episode-length").selectOption("45");
  await page.getByTestId("episodes").selectOption("3");
  // 3 × 45 = 135 min recording + 30 min setup = 2h 45m (no rounding). 2.75 × ₹950 = ₹2,613.
  await expect(page.getByTestId("work-time")).toHaveText("2h 15m");
  await expect(page.getByTestId("setup-time")).toHaveText("+ 30m");
  await expect(page.getByTestId("session-summary")).toContainText("2h 45m · ₹2,613");
  await expect(page.getByTestId("gap-note")).toContainText("30 minutes free");

  // Shortest podcast: 15 min + 30 min setup = 45 min → ₹713 by time, raised to the package's starting price ₹1,899.
  await page.getByTestId("episode-length").selectOption("15");
  await page.getByTestId("episodes").selectOption("1");
  await expect(page.getByTestId("session-summary")).toContainText("45m · ₹1,899");
  await expect(page.getByTestId("minimum-note")).toContainText("₹1,899");

  await page.getByLabel(/Content Creation/).check();
  await page.getByTestId("reels").selectOption("4");
  await page.getByTestId("long-videos").selectOption("1");
  // 4 × 15 + 1 × 30 = 90 min shoot + 30 min setup = 2h at ₹950/hr = ₹1,900.
  await expect(page.getByTestId("session-summary")).toContainText("2h");
  await expect(page.getByTestId("session-summary")).toContainText("₹1,900");
  await page.getByTestId("reels").selectOption("0");
  await page.getByTestId("long-videos").selectOption("0");
  await expect(page.getByText("Pick at least one reel or video.")).toBeVisible();

  await page.getByLabel(/Small Private Celebration/).check();
  await page.getByTestId("hours").selectOption("3");
  await expect(page.getByTestId("session-summary")).toContainText("₹2,397");
  await expect(page.getByTestId("setup-time")).toHaveCount(0); // only space: no setup added
  await expect(page.getByTestId("quote-total")).toHaveText("₹2,828"); // 2,397 + 18% GST
});

test("changing the session after holding a slot releases the hold", async ({ page }) => {
  await page.goto("/book?package=podcast");
  await chooseDate(page, 20);
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
  expect((await request.post("/api/holds", { data: { packageId: "podcast", start, durationMinutes: 20 } })).status()).toBe(400);
});

test("every booking keeps a 30-minute gap before the next one", async ({ request }, info) => {
  const day = new Date(Date.now() + (52 + (info.project.name === "gate-open" ? 1 : 0)) * 86400_000).toISOString().slice(0, 10);
  const get = async () =>
    (await (await request.get(`/api/availability?date=${day}&packageId=podcast&duration=90`)).json()).slots as { start: string; status: string }[];
  const before = await get();
  const first = before.find((s) => s.status === "available")!;
  const r = await request.post("/api/holds", { data: { packageId: "podcast", start: first.start, durationMinutes: 90 } });
  expect(r.status()).toBe(201);
  const startMs = Date.parse(first.start);
  const after = await get();
  const at = (mins: number) => after.find((s) => Date.parse(s.start) === startMs + mins * 60_000)?.status;
  expect(at(90)).toBe("held"); // ends at +90; the next 30 minutes stay free
  expect(at(120)).toBe("available"); // +90 session + 30 gap
});
