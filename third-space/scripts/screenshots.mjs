#!/usr/bin/env node
/**
 * 390px full-page screenshots of every page in both Legal Gate states.
 * Expects servers on :3100 (gate closed) and :3101 (gate open), e.g. the ones
 * Playwright starts. Output: docs/screenshots/<gate>/<page>.png
 */
import { mkdirSync } from "node:fs";
import pw from "@playwright/test";

const { chromium } = pw;
const pages = ["/", "/watch", "/create", "/celebrate", "/book", "/visit", "/policies", "/contact", "/podcast-studio-in-dhanbad", "/private-theatre-in-dhanbad"];
const browser = await chromium.launch();
for (const [gate, port] of [["gate-closed", 3100], ["gate-open", 3101]]) {
  mkdirSync(`docs/screenshots/${gate}`, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  for (const p of pages) {
    const res = await page.goto(`http://localhost:${port}${p}`, { waitUntil: "networkidle" });
    const name = p === "/" ? "home" : p.slice(1);
    await page.screenshot({ path: `docs/screenshots/${gate}/${name}.png`, fullPage: true });
    console.log(gate, p, res?.status());
  }
  await ctx.close();
}
await browser.close();
