import { createHmac } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { adminLogin, isOpen } from "./helpers";

const WEBHOOK_SECRET = "test-webhook-secret";

/** Creates a pending (online, mock-provider) podcast booking through the public API. */
async function pendingBooking(request: APIRequestContext, dayOffset: number, phone: string) {
  for (let k = dayOffset; k < dayOffset + 40; k += 3) {
    const day = new Date(Date.now() + k * 86400_000).toISOString().slice(0, 10);
    const slots = (await (await request.get(`/api/availability?date=${day}&packageId=podcast&duration=90`)).json()).slots as { start: string; status: string }[];
    const free = slots.find((s) => s.status === "available");
    if (!free) continue;
    const hold = await (await request.post("/api/holds", { data: { packageId: "podcast", start: free.start, durationMinutes: 90 } })).json();
    if (!hold.id) continue;
    await request.post("/api/otp", { data: { action: "send", phone } });
    await request.post("/api/otp", { data: { action: "verify", phone, code: "123456" } });
    const r = await request.post("/api/checkout", {
      data: {
        holdId: hold.id,
        packageId: "podcast",
        mode: "create",
        addOnIds: [],
        guestCount: 1,
        locale: "en",
        session: { episodeMinutes: 60, episodes: 1 },
        guest: { name: "Webhook Guest", phone, email: "webhook@thirdspace.in" },
        consent: { declaration: true, venue: true, recording: true },
      },
    });
    expect(r.status()).toBe(200);
    return (await r.json()) as { bookingId: string; orderId: string; amount: number };
  }
  throw new Error("no free podcast slot");
}

function signed(body: object) {
  const raw = JSON.stringify(body);
  return { raw, sig: createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex") };
}

test.describe("Master prompt: pages and routes", () => {
  test("all guest pages answer, old routes redirect, PWA manifest exists", async ({ request }) => {
    for (const p of ["/creator-plans", "/gallery", "/about", "/faqs", "/privacy", "/terms", "/cancellation-refund", "/my-booking", "/podcast-studio", "/celebrations", "/private-theatre"]) {
      expect((await request.get(p)).status(), p).toBe(200);
    }
    for (const [from, to] of [["/watch", "/private-theatre"], ["/create", "/podcast-studio"], ["/celebrate", "/celebrations"]]) {
      const r = await request.get(from, { maxRedirects: 0 });
      expect(r.status()).toBe(308);
      expect(r.headers()["location"]).toContain(to);
    }
    const m = await (await request.get("/manifest.webmanifest")).json();
    expect(m.short_name).toBe("THIRD SPACE");
  });

  test("home shows brand tagline, endorsement, location map and FAQs", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Your Voice. Your Space.");
    await expect(page.getByTestId("endorsement")).toHaveText(/LovBites Hospitality Group/i);
    await expect(page.locator("#location iframe")).toHaveCount(1);
    await expect(page.locator("#faq details").first()).toBeVisible();
    await expect(page.locator("#popular [data-testid^=package-]").first()).toBeVisible();
  });

  test("calendar API marks each day available, full or unavailable", async ({ request }) => {
    const month = new Date(Date.now() + 35 * 86400_000).toISOString().slice(0, 7);
    const r = await request.get(`/api/calendar?month=${month}&packageId=podcast&duration=90`);
    expect(r.status()).toBe(200);
    const days = (await r.json()).days as Record<string, string>;
    expect(Object.keys(days).length).toBeGreaterThan(27);
    expect(Object.values(days).every((s) => ["available", "full", "unavailable"].includes(s))).toBe(true);
    expect(Object.values(days)).toContain("available");
  });
});

test.describe("Payments, My Booking and admin controls", () => {
  test.beforeEach(({}, info) => test.skip(isOpen(info), "runs once, on the gate-closed server"));

  test("webhook confirms a pending booking once; guest finds and cancels it", async ({ page, request }) => {
    const phone = "9876500111";
    const b = await pendingBooking(request, 61, phone);
    expect(b.orderId).toBeTruthy();

    // Unsigned / wrongly signed webhooks are refused.
    const bad = await request.post("/api/webhooks/razorpay", { data: "{}", headers: { "content-type": "application/json", "x-razorpay-signature": "nope" } });
    expect(bad.status()).toBe(400);

    const evt = { event: "payment.captured", payload: { payment: { entity: { id: `pay_test_${Date.now()}`, order_id: b.orderId } } } };
    const { raw, sig } = signed(evt);
    const headers = { "content-type": "application/json", "x-razorpay-signature": sig, "x-razorpay-event-id": `evt_${Date.now()}` };
    const first = await request.post("/api/webhooks/razorpay", { data: raw, headers });
    expect(first.status()).toBe(200);
    expect(await first.text()).toBe("ok");
    const again = await request.post("/api/webhooks/razorpay", { data: raw, headers });
    expect(await again.text()).toContain("duplicate");

    // Guest lookup needs ID + phone + email.
    await page.goto("/my-booking");
    const form = page.getByTestId("find-booking");
    await form.getByTestId("find-id").fill(b.bookingId);
    await form.getByTestId("find-phone").fill(phone);
    await form.getByTestId("find-email").fill("wrong@thirdspace.in");
    await form.getByRole("button").click();
    await expect(form.getByText(/could not find/i)).toBeVisible();
    await form.getByTestId("find-email").fill("webhook@thirdspace.in");
    await form.getByRole("button").click();
    await expect(page.getByTestId("receipt-status")).toHaveAttribute("data-status", "confirmed");
    await expect(page.getByTestId("receipt-id")).toHaveText(b.bookingId);

    // Guest cancels: refund tier applies to the advance paid online.
    const cancel = page.getByTestId("guest-cancel");
    await cancel.getByRole("checkbox").check();
    await cancel.getByRole("button").click();
    await expect(page.getByTestId("cancel-done")).toContainText(/cancelled/i);
    await expect(page.getByTestId("receipt-status")).toHaveAttribute("data-status", /refund_pending|cancelled/);
  });

  test("coupons apply only when created by admin", async ({ page, request }) => {
    expect((await request.post("/api/coupons", { data: { code: "NOPE123", packageId: "podcast" } })).status()).toBe(404);
    await adminLogin(page);
    await page.goto("/admin/coupons");
    const code = `T${Date.now().toString(36).toUpperCase()}`;
    const form = page.getByTestId("coupon-form");
    await form.getByLabel("Code").fill(code);
    await form.getByLabel("Value").fill("10");
    await form.getByRole("button", { name: "Save coupon" }).click();
    await expect(page.getByTestId("coupon-rows")).toContainText(code);
    const r = await request.post("/api/coupons", { data: { code, packageId: "podcast" } });
    expect(r.status()).toBe(200);
    expect((await r.json()).rule.value).toBe(10);
  });

  test("CSV export needs a login; staff role cannot open finance pages", async ({ page, request }) => {
    const anon = await request.get("/admin/export/bookings", { maxRedirects: 0 });
    expect(anon.status()).toBe(403);

    await adminLogin(page);
    const csv = await page.request.get("/admin/export/bookings");
    expect(csv.headers()["content-type"]).toContain("text/csv");
    expect((await csv.text()).split("\n")[0]).toMatch(/id/i);

    const email = `staff${Date.now().toString(36)}@thirdspace.in`;
    await page.goto("/admin/staff");
    const f = page.locator("form").filter({ has: page.getByRole("button", { name: "Save account" }) });
    await f.getByLabel("Name").fill("Desk Staff");
    await f.getByLabel("Email (login)").fill(email);
    await f.getByLabel("Role").selectOption("staff");
    await f.getByLabel(/Password/).fill("desk-staff-pass-1");
    await f.getByRole("button", { name: "Save account" }).click();
    await expect(f.getByRole("status")).toContainText(`Saved ${email}`);

    await page.context().clearCookies();
    await page.goto("/admin/login");
    await page.getByTestId("admin-name").fill(email);
    await page.getByTestId("admin-password").fill("desk-staff-pass-1");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/payments");
    await expect(page).toHaveURL(/denied=/);
    await expect(page.getByText("Your role cannot open that page.")).toBeVisible();
    const denied = await page.request.get("/admin/export/payments", { maxRedirects: 0 });
    expect(denied.status()).toBe(403);
  });
});
