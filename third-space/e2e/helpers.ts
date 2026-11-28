import { expect, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";

export const isOpen = (info: TestInfo) => info.project.name === "gate-open";

/**
 * Pick a date at least `offset` days after the first bookable date that still
 * has a free slot. Tests share a database across runs, so earlier days fill up.
 */
export async function chooseDate(page: Page, offset: number) {
  const input = page.getByTestId("date-input");
  const min = (await input.getAttribute("min"))!;
  const max = (await input.getAttribute("max"))!;
  for (let k = offset; ; k += 9) {
    const d = new Date(`${min}T12:00:00+05:30`);
    d.setUTCDate(d.getUTCDate() + k);
    const iso = d.toISOString().slice(0, 10);
    if (iso > max) throw new Error("No free date left in the booking window; use a fresh test database");
    await input.fill(iso);
    await expect(page.locator('[data-testid="slot"]').first().or(page.getByText(/No slots left|slot khaali nahi/))).toBeVisible();
    await page.waitForLoadState("networkidle");
    if ((await page.locator('[data-testid="slot"][data-status="available"]').count()) > 0) return iso;
  }
}

export async function firstAvailableSlot(page: Page) {
  return page.locator('[data-testid="slot"][data-status="available"]').first();
}

/** Guest Stepper: click + or - until the count shows `n`. */
export async function setGuests(page: Page, n: number) {
  const out = page.getByTestId("guest-count");
  for (let i = 0; i < 12; i++) {
    const cur = Number((await out.innerText()).trim());
    if (cur === n) return;
    await page.getByTestId(cur < n ? "guest-plus" : "guest-minus").click();
  }
  await expect(out).toHaveText(String(n));
}

export async function fillDetailsAndVerify(page: Page) {
  await page.getByTestId("guest-name").fill("Test Guest");
  await page.getByTestId("guest-email").fill("guest@thirdspace.in");
  await page.getByTestId("guest-phone").fill("9876543210");
  await page.getByTestId("send-otp").click();
  await page.getByTestId("otp-input").fill("123456");
  await page.getByTestId("verify-otp").click();
  await expect(page.getByTestId("otp-status")).toHaveText(/verified|verify ho gaya/i);
}

/** Tick the mandatory boxes: declaration, venue rules and (studio services) recording consent. */
export async function acceptTerms(page: Page, { recording = false } = {}) {
  await page.getByTestId("consent-declaration").check();
  await page.getByTestId("consent-venue").check();
  if (recording) await page.getByTestId("consent-recording").check();
}

export async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByTestId("admin-name").fill("Asha (test)");
  await page.getByTestId("admin-password").fill("test-staff-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByTestId("readiness")).toBeVisible();
}

/** Books a podcast slot through the UI and returns the booking ID. */
export async function bookPodcast(page: Page, offset: number) {
  await page.goto("/book?package=podcast");
  await chooseDate(page, offset);
  await (await firstAvailableSlot(page)).click();
  await expect(page.getByTestId("hold-banner")).toBeVisible();
  await setGuests(page, 2);
  await fillDetailsAndVerify(page);
  await acceptTerms(page, { recording: true });
  await page.getByTestId("pay-button").click();
  await expect(page.getByTestId("booking-id")).toHaveText(/^TS-/);
  return (await page.getByTestId("booking-id").textContent())!.trim();
}

/** Adds a licensed title through the admin panel and returns its unique name. */
export async function addTitle(page: Page, runtimeMinutes: number) {
  await adminLogin(page);
  const name = `Test Title ${Date.now().toString(36)}`;
  await page.goto("/admin/titles");
  const form = page.getByTestId("title-form");
  await form.getByLabel("Title", { exact: true }).fill(name);
  await form.getByLabel("Runtime (minutes)").fill(String(runtimeMinutes));
  await form.getByLabel("Language").fill("Hindi");
  await form.getByLabel("Licence reference").fill("TEST-LIC-001");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Add title" }).click();
  await expect(form.getByRole("status")).toContainText(`Added ${name}`);
  return name;
}

/**
 * First day from `fromDay` days ahead with a free podcast slot of `duration` minutes, via the public API.
 * The test database keeps data between runs, so fixed days fill up; tests search instead.
 */
export async function freeApiSlot(request: APIRequestContext, fromDay: number, duration: number, step = 1) {
  // Random start offset so parallel tests (and both gate projects) rarely pick the same day.
  const jitter = Math.floor(Math.random() * 5) * step;
  // The booking window is 60 days from the first bookable date; never search past day 58.
  for (let k = fromDay + jitter; k < Math.min(fromDay + jitter + 15 * step, 58); k += step) {
    const day = new Date(Date.now() + k * 86400_000).toISOString().slice(0, 10);
    const slots = (await (await request.get(`/api/availability?date=${day}&packageId=podcast&duration=${duration}`)).json()).slots as { start: string; status: string }[];
    const free = slots.find((s) => s.status === "available");
    if (free) return { day, start: free.start, slots };
  }
  throw new Error("No free podcast slot found; use a fresh test database");
}
