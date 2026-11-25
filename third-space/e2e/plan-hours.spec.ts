import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { adminLogin, isOpen } from "./helpers";

const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL ?? "postgresql://thirdspace:thirdspace@localhost:5432/thirdspace_test" } } });
test.afterAll(async () => { await db.$disconnect(); });
test.beforeEach(({}, info) => test.skip(isOpen(info), "runs once, on the gate-closed server"));

const day = (n: number) => new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);

test("staff book a session with Creator Plan hours: minutes leave the ledger in the same step", async ({ page }) => {
  const phone = `97${String(Date.now()).slice(-8)}`;
  const base = 12 + Math.floor(Math.random() * 30); // random start day inside the 60-day window so reruns on a reused database rarely collide
  await adminLogin(page);

  async function book(pkgLabel: RegExp, date: string, time: string, minutes: number, plan?: boolean): Promise<boolean> {
    await page.goto("/admin/bookings/new");
    const f = page.getByTestId("manual-booking");
    await f.getByLabel("Package").selectOption({ label: (await f.getByLabel("Package").locator("option").filter({ hasText: pkgLabel }).first().innerText()).trim() });
    await f.getByLabel("Total minutes (incl. setup)").fill(String(minutes));
    await f.getByLabel("Date").fill(date);
    await f.getByLabel("Start time").fill(time);
    await f.getByLabel("Guest name").fill("Plan Guest");
    await f.getByLabel("Mobile number", { exact: true }).fill(phone);
    await f.getByLabel("Email (optional)").fill("plan@thirdspace.in");
    await f.getByLabel(/Send the confirmation/).uncheck();
    if (plan) {
      const label = (await f.getByTestId("plan-select").locator("option").filter({ hasText: phone }).first().innerText()).trim();
      await f.getByTestId("plan-select").selectOption({ label });
    }
    await f.getByRole("button", { name: "Create booking" }).click();
    // Either the booking page opens, or staff are told the time is taken (another spec may hold that studio slot).
    const ok = await Promise.race([
      page.waitForURL(/\/admin\/bookings\/TS-/, { timeout: 15000 }).then(() => true),
      f.getByRole("alert").first().waitFor({ timeout: 15000 }).then(() => false),
    ]);
    return ok;
  }

  async function bookSomewhere(pkgLabel: RegExp, firstDay: number, minutes: number, plan?: boolean) {
    for (let d = firstDay; d < firstDay + 12; d++) {
      for (const time of ["10:00", "12:30", "15:00", "17:30"]) {
        if (await book(pkgLabel, day(d), time, minutes, plan)) return d;
      }
    }
    throw new Error("no free studio slot found in 12 days");
  }

  // 1. The guest buys a Creator Plan (confirmed booking of the plan package) => 8 h in, first 2 h used.
  const planDay = await bookSomewhere(/Creator Plan/i, base, 120);
  const planBooking = page.url().split("/").pop()!;
  const plan = await db.creatorMembership.findFirstOrThrow({ where: { bookingId: planBooking } });
  const sum = async () => (await db.creditEntry.aggregate({ where: { membershipId: plan.id }, _sum: { minutes: true } }))._sum.minutes;
  expect(await sum()).toBe(480 - 120);

  // 2. A 90-minute podcast session paid with plan hours: nothing is charged, 90 minutes leave the ledger.
  await bookSomewhere(/Podcast/i, planDay + 1, 90, true);
  const id = page.url().split("/").pop()!;
  const b = await db.booking.findUniqueOrThrow({ where: { id } });
  expect(b.total).toBe(0);
  expect(b.status).toBe("confirmed");
  expect(await sum()).toBe(360 - 90);
  const entry = await db.creditEntry.findFirstOrThrow({ where: { bookingId: id, kind: "consume" } });
  expect(entry.minutes).toBe(-90);
  expect(entry.membershipId).toBe(plan.id);

  // 3. Cancelling that booking in admin gives the minutes back, once.
  await page.goto(`/admin/bookings/${id}`);
  const cancel = page.getByTestId("cancel");
  await cancel.getByLabel("Reason").fill("Guest changed plans");
  await cancel.getByRole("button", { name: "Cancel booking" }).click();
  await expect.poll(sum).toBe(360);
  expect(await db.creditEntry.count({ where: { bookingId: id, kind: "restore" } })).toBe(1);
});
