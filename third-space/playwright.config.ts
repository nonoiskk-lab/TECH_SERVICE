import { defineConfig } from "@playwright/test";

/**
 * e2e at 390px for both Legal Gate states. One production build serves two
 * servers: gate closed on :3100 and gate open on :3101, sharing a test
 * database that `npm run test:e2e` migrates first (it never resets data;
 * tests pick free slots, so they tolerate earlier runs). Run `npm run build` first.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://thirdspace:thirdspace@localhost:5432/thirdspace_test";

const contactEnv = {
  DATABASE_URL: TEST_DATABASE_URL,
  ADMIN_PASSWORD: "test-staff-password",
  AUTH_SECRET: "test-auth-secret-at-least-16-chars",
  PAYMENTS_MODE: "mock",
  RATE_LIMIT_DISABLED: "1",
  OTP_MODE: "mock",
};

const use = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: true,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { trace: "off" },
  projects: [
    { name: "gate-closed", testIgnore: /live\.spec/, use: { ...use, baseURL: "http://localhost:3100" } },
    { name: "gate-open", testIgnore: /live\.spec/, use: { ...use, baseURL: "http://localhost:3101" } },
    // Settings of the live site without Razorpay keys or an SMS provider.
    { name: "live-mode", testMatch: /live\.spec/, use: { ...use, baseURL: "http://localhost:3102" } },
  ],
  webServer: [
    {
      command: "npx next start -p 3100",
      url: "http://localhost:3100/api/public-config",
      env: { ...contactEnv, THIRD_SPACE_LEGAL_GATE: "closed" },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npx next start -p 3101",
      url: "http://localhost:3101/api/public-config",
      env: { ...contactEnv, THIRD_SPACE_LEGAL_GATE: "open" },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npx next start -p 3102",
      url: "http://localhost:3102/api/public-config",
      env: { ...contactEnv, THIRD_SPACE_LEGAL_GATE: "closed", PAYMENTS_MODE: "venue", OTP_MODE: "off" },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
