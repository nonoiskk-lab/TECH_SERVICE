import { expect, test } from "@playwright/test";
import { acceptTerms, chooseDate, fillDetailsAndVerify, firstAvailableSlot, isOpen } from "./helpers";

test("booking happy path: podcast, advance paid, booking ID shown", async ({ page }, info) => {
  await page.goto("/book?package=podcast");
  await chooseDate(page, 1 + (isOpen(info) ? 10 : 0));
  await page.getByTestId("addon-extra-camera").check();
  // Default: 1 episode × 60 min + 30 min setup = 1h 30m at ₹950/hr = ₹1,425; + ₹499 camera; + 18% GST.
  await expect(page.getByTestId("session-summary")).toContainText("1h 30m");
  await expect(page.getByTestId("quote-total")).toHaveText("₹2,270");
  await expect(page.getByTestId("quote-advance")).toHaveText("₹1,135");
  await (await firstAvailableSlot(page)).click();
  await expect(page.getByTestId("hold-banner")).toBeVisible();
  await expect(page.getByTestId("hold-countdown")).toHaveText(/^1[45]:\d\d$/);
  await fillDetailsAndVerify(page);
  // Refund tiers and venue rules are visible before the pay button.
  await expect(page.getByTestId("refund-tiers")).toBeVisible();
  await expect(page.getByTestId("venue-rules")).toBeVisible();
  // Plain-language summary, links to the full terms and the declaration are shown before paying.
  await expect(page.getByTestId("policy-summary")).toContainText("Strict 18+ venue");
  await expect(page.getByTestId("link-safety")).toHaveAttribute("href", "/policies/safety");
  await expect(page.getByTestId("link-addendum")).toHaveAttribute("href", "/policies/podcast");
  await expect(page.getByTestId("declaration")).toContainText("I am 18 years of age or older");
  const declaration = page.getByTestId("consent-declaration");
  await expect(declaration).not.toBeChecked(); // initially unchecked
  const pay = page.getByTestId("pay-button");
  await expect(pay).toBeDisabled();
  await page.getByTestId("consent-venue").check();
  await page.getByTestId("consent-recording").check();
  await expect(pay).toBeDisabled(); // declaration still missing
  await declaration.check();
  // Optional consents are separate boxes and stay off by default.
  await expect(page.getByTestId("consent-promotional")).not.toBeChecked();
  await expect(page.getByTestId("consent-marketing")).not.toBeChecked();
  await expect(pay).toBeEnabled();
  await pay.click();
  await expect(page).toHaveURL(/\/book\/confirmation\/TS-[A-Z0-9]{6}\?t=[a-f0-9]{32}/);
  await expect(page.getByTestId("booking-id")).toHaveText(/^TS-[A-Z0-9]{6}$/);
  await expect(page.getByTestId("acceptance-summary")).toContainText("version 2.0");
  // Downloadable copy of the accepted declaration.
  const href = await page.getByTestId("download-declaration").getAttribute("href");
  const copy = await (await page.request.get(href!)).text();
  expect(copy).toContain("THIRD SPACE — Mandatory Customer Declaration");
  expect(copy).toContain("Policy pack version: 2.0");
  expect(copy).toContain("Podcast Studio — Terms Addendum, version 2.0");
  expect(copy).toContain("Optional: THIRD SPACE may use my image/voice/recording for promotion: No");
  // Without the token the booking is not visible.
  const id = (await page.getByTestId("booking-id").textContent())!.trim();
  await page.goto(`/book/confirmation/${id}`);
  await expect(page.getByTestId("booking-not-found")).toBeVisible();
});

test("hold expiry releases the slot after 15 minutes", async ({ page }, info) => {
  await page.clock.install();
  await page.goto("/book?package=podcast");
  await chooseDate(page, 2 + (isOpen(info) ? 10 : 0));
  const slot = await firstAvailableSlot(page);
  const start = await slot.getAttribute("data-start");
  await slot.click();
  await expect(page.getByTestId("hold-banner")).toBeVisible();
  await page.clock.fastForward("15:02");
  await expect(page.getByTestId("flow-error")).toContainText(/hold ran out|Hold ka time khatam/);
  await expect(page.getByTestId("hold-banner")).toBeHidden();
  await expect(page.locator(`[data-testid="slot"][data-start="${start}"]`)).toHaveAttribute("data-status", "available");
});

test("slot-taken error when someone else holds the slot first", async ({ page, request }, info) => {
  await page.goto("/book?package=podcast");
  await chooseDate(page, 3 + (isOpen(info) ? 10 : 0));
  const slot = await firstAvailableSlot(page);
  const start = await slot.getAttribute("data-start");
  const r = await request.post("/api/holds", { data: { packageId: "podcast", start } });
  expect(r.status()).toBe(201);
  await page.locator(`[data-testid="slot"][data-start="${start}"]`).click();
  await expect(page.getByTestId("flow-error")).toContainText(/just took that slot|kisi aur ne le liya/);
  await expect(page.locator(`[data-testid="slot"][data-start="${start}"]`)).toHaveAttribute("data-status", "held");
  await expect(page.getByTestId("hold-banner")).toBeHidden();
});

test("free visit books without payment", async ({ page }, info) => {
  await page.goto("/visit");
  await chooseDate(page, 4 + (isOpen(info) ? 10 : 0));
  await (await firstAvailableSlot(page)).click();
  await fillDetailsAndVerify(page);
  await acceptTerms(page);
  await expect(page.getByTestId("link-addendum")).toHaveCount(0); // visit accepts the master policy only
  await expect(page.getByTestId("pay-button")).toHaveText(/free visit|Free visit/i);
  await page.getByTestId("pay-button").click();
  await expect(page.getByTestId("booking-id")).toHaveText(/^TS-/);
});

test("server refuses a booking without the mandatory declaration", async ({ request }, info) => {
  const day = new Date(Date.now() + 40 * 86400_000 + (isOpen(info) ? 86400_000 : 0)).toISOString().slice(0, 10);
  const slots = (await (await request.get(`/api/availability?date=${day}&packageId=podcast`)).json()).slots as { start: string; status: string }[];
  const start = slots.find((s) => s.status === "available")!.start;
  const hold = await (await request.post("/api/holds", { data: { packageId: "podcast", start } })).json();
  await request.post("/api/otp", { data: { action: "send", phone: "9876500001" } });
  await request.post("/api/otp", { data: { action: "verify", phone: "9876500001", code: "123456" } });
  const body = {
    holdId: hold.id,
    packageId: "podcast",
    mode: "create",
    addOnIds: [],
    guestCount: 1,
    locale: "en",
    session: { episodeMinutes: 60, episodes: 1 },
    guest: { name: "No Declaration", phone: "9876500001", email: "nd@thirdspace.in" },
    consent: { declaration: false, venue: true, recording: true },
  };
  expect((await request.post("/api/checkout", { data: body })).status()).toBe(400);
  expect((await request.post("/api/checkout", { data: { ...body, consent: { venue: true, recording: true } } })).status()).toBe(400);
  expect((await request.post("/api/checkout", { data: { ...body, guestCount: 9, consent: { ...body.consent, declaration: true } } })).status()).toBe(400);
  const ok = await request.post("/api/checkout", { data: { ...body, consent: { ...body.consent, declaration: true } } });
  expect(ok.status()).toBe(200);
});
