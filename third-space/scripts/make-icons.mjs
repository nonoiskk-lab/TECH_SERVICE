// Regenerates the PNG icons from public/brand/logo-mark.svg (orange/white, v6.1). Run: node scripts/make-icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";

const svg = readFileSync("public/brand/logo-mark.svg");
const out = (name) => `public/${name}`;
const mark = (px) => sharp(svg, { density: 384 }).resize(px, px).png().toBuffer();
const onWhite = async (size, markPx, file) =>
  sharp({ create: { width: size, height: size, channels: 3, background: "#ffffff" } })
    .composite([{ input: await mark(markPx), gravity: "centre" }]).png().toFile(out(file));
const onOrange = async (size, markPx, file) =>
  sharp({ create: { width: size, height: size, channels: 3, background: "#ff7a1a" } })
    .composite([{ input: await sharp(readFileSync("public/brand/logo-mark-on-orange.svg"), { density: 384 }).resize(markPx, markPx).png().toBuffer(), gravity: "centre" }]).png().toFile(out(file));

await onWhite(192, 176, "icon-192.png");
await onWhite(512, 470, "icon-512.png");
// maskable: full-bleed orange, mark inside the 80% safe zone
await onOrange(512, 320, "icon-512-maskable.png");
// iOS home screen icon: no transparency
await onOrange(180, 120, "../src/app/apple-icon.png");
console.log("icons written");
