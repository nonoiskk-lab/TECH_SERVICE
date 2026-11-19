import { defineConfig } from "@playwright/test";

/**
 * e2e at 390px for both Legal Gate states. One production build serves two
 * servers: gate closed on :3100 and gate open on :3101. Run `npm run build` first.
 */
const contactEnv = {
  THIRD_SPACE_PHONE: "+91 98765 43210",
  THIRD_SPACE_EMAIL: "hello@thirdspace.in",
  THIRD_SPACE_ADDRESS_LINE: "Bank More",
  THIRD_SPACE_MAP_URL: "https://maps.google.com/?q=Dhanbad",
};

const use = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: true,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { trace: "off" },
  projects: [
    { name: "gate-closed", use: { ...use, baseURL: "http://localhost:3100" } },
    { name: "gate-open", use: { ...use, baseURL: "http://localhost:3101" } },
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
  ],
});
