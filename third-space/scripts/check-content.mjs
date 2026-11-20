#!/usr/bin/env node
/**
 * Build-failing content checks (run against a running server):
 *
 *   node scripts/check-content.mjs http://localhost:3100
 *
 * 1. Placeholder scan over rendered pages: lorem, example.com, TODO,
 *    placeholder, bare "#" hrefs, foreign phone numbers.
 * 2. Consistency: hours, address, phone and email shown in header, footer,
 *    contact, policies and JSON-LD must all equal /api/public-config.
 * 3. Link checker: every internal link answers 200; no visible error text.
 * 4. Unverifiable claims: '100%', 'best in', 'number one', 'guaranteed' in
 *    copy files or rendered pages, unless whitelisted in claims-whitelist.json.
 * 5. Legal Gate: when the gate is closed, no page, meta tag, OG tag, RSC payload
 *    or sitemap entry may advertise film screenings.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.argv[2] || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const failures = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);

const PLACEHOLDER = /\blorem\b|example\.(com|org|net)|\bTODO\b|\bTBD\b|\bplaceholder\b|xxx-?xxx/i;
const ERROR_TEXT = /Application error|Internal Server Error|\bundefined\b|\bNaN\b|\[object Object\]|Unhandled Runtime Error/;
const CLAIMS = /100\s?%|\bbest in\b|\bnumber one\b|\bno\.? ?1\b|\bguaranteed?\b/i;
const SCREENING = /\b(films?|movies?|screenings?|cinema|OTT|Netflix|Prime Video|Hotstar|blockbusters?)\b/i;
// Legal-policy wording that uses these words without advertising screenings.
const GATE_ALLOWED = ["promote, film or livestream", "OTT/digital publisher"];
const stripAllowed = (s) => GATE_ALLOWED.reduce((acc, p) => acc.split(p).join(" "), s);

const whitelist = JSON.parse(readFileSync(join(ROOT, "scripts/claims-whitelist.json"), "utf8"));
const isWhitelisted = (s) => whitelist.some((w) => s.includes(w));

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

function decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"');
}

async function get(path) {
  const r = await fetch(BASE + path, { redirect: "manual" });
  return { status: r.status, body: await r.text() };
}

// ---- 4a. Claims in copy files -------------------------------------------
function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx|json|md)$/.test(f) ? [p] : [];
  });
}
for (const dir of ["src/i18n", "src/config", "src/app", "src/components"]) {
  for (const file of walk(join(ROOT, dir))) {
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (CLAIMS.test(line) && !isWhitelisted(line)) fail(`${file.replace(ROOT + "/", "")}:${i + 1}`, `unverifiable claim "${line.trim().slice(0, 80)}"`);
      });
  }
}

// ---- Crawl --------------------------------------------------------------
const cfgRes = await get("/api/public-config");
if (cfgRes.status !== 200) {
  console.error(`Cannot reach ${BASE}/api/public-config (status ${cfgRes.status})`);
  process.exit(2);
}
const cfg = JSON.parse(cfgRes.body);
const gate = cfg.gateOpen ? "open" : "closed";

const sitemap = await get("/sitemap.xml");
const sitemapPaths = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
if (gate === "closed" && SCREENING.test(sitemap.body + sitemapPaths.join(" "))) fail("sitemap.xml", "mentions screenings while gate is closed");
if (gate === "closed" && sitemapPaths.some((p) => /watch|theatre/.test(p))) fail("sitemap.xml", "lists a Theatre page while gate is closed");

const queue = [...new Set(["/", ...sitemapPaths, "/private-theatre", "/celebrations", "/visit", "/book", "/policies", "/policies/safety", "/policies/podcast", "/policies/creator", "/contact"])];
const seen = new Set();
const consistency = { phone: new Set(), address: new Set(), hours: new Set(), email: new Set() };

while (queue.length && seen.size < 150) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  seen.add(path);
  const { status, body } = await get(path);
  if (status !== 200) {
    fail(path, `HTTP ${status} (dead internal link)`);
    continue;
  }
  const text = visibleText(body);

  // 1. Placeholders
  const ph = text.match(PLACEHOLDER);
  if (ph) fail(path, `placeholder text "${ph[0]}"`);
  if (/href="#"/.test(body)) fail(path, `bare "#" href`);
  for (const m of body.matchAll(/href="tel:([^"]+)"/g)) {
    if (!/^(\+91|0)?[6-9]\d{9}$/.test(m[1].replace(/[^\d+]/g, ""))) fail(path, `non-Indian phone link ${m[1]}`);
  }
  const foreign = text.match(/\+(?!91\b)\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/);
  if (foreign) fail(path, `foreign-looking phone number "${foreign[0]}"`);

  // 3. Visible error text
  const err = text.match(ERROR_TEXT);
  if (err) fail(path, `visible error text "${err[0]}"`);

  // 4b. Claims in rendered copy
  const claim = text.match(CLAIMS);
  if (claim && !isWhitelisted(claim[0])) fail(path, `unverifiable claim "${claim[0]}"`);

  // 5. Legal Gate: visible text, title/meta/OG tags and the full HTML (RSC payload)
  if (gate === "closed") {
    const head = body.match(/<head>[\s\S]*?<\/head>/)?.[0] ?? "";
    const metas = [...head.matchAll(/<(title)>([^<]*)<|<meta[^>]+content="([^"]*)"/g)].map((m) => m[2] ?? m[3]).join(" ");
    const s = stripAllowed(text).match(SCREENING) || metas.match(SCREENING) || stripAllowed(body).match(SCREENING);
    if (s) fail(path, `advertises screenings while gate is closed ("${s[0]}")`);
  }

  // 2. Consistency values
  for (const m of body.matchAll(/data-consistency="(\w+)"[^>]*>([^<]*)</g)) {
    if (consistency[m[1]]) consistency[m[1]].add(decode(m[2]).trim());
  }
  for (const m of body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const ld = JSON.parse(m[1]);
      if (ld["@type"] === "LocalBusiness") {
        if ((ld.telephone ?? "") !== cfg.phone) fail(path, `JSON-LD telephone "${ld.telephone}" != config "${cfg.phone}"`);
        if (ld.address?.streetAddress !== cfg.address) fail(path, `JSON-LD address != config`);
        const oh = ld.openingHoursSpecification?.[0];
        if (oh?.opens !== cfg.open || oh?.closes !== cfg.close) fail(path, `JSON-LD hours != config`);
        if ((ld.email ?? "") !== cfg.email) fail(path, `JSON-LD email != config`);
      }
    } catch {
      fail(path, "invalid JSON-LD");
    }
  }

  // Follow internal links
  for (const m of body.matchAll(/href="(\/[^"#]*)/g)) {
    const href = decode(m[1]);
    if (href.startsWith("/_next") || href.startsWith("/api/") || /\.(css|js|ico|png|svg|webp|avif|woff2?)$/.test(href)) continue;
    if (!seen.has(href)) queue.push(href);
  }
}

const expected = { phone: cfg.phone, address: cfg.address, hours: cfg.hoursLabel, email: cfg.email };
for (const [k, vals] of Object.entries(consistency)) {
  for (const v of vals) {
    // Hours label is localised; the crawler fetches the default (English) locale.
    if (v !== expected[k]) fail("consistency", `${k} shown as "${v}" but config says "${expected[k]}"`);
  }
  if (expected[k] && vals.size === 0) fail("consistency", `${k} is configured but never shown`);
}

console.log(`Checked ${seen.size} pages on ${BASE} (gate ${gate}).`);
if (failures.length) {
  console.error(`\n${failures.length} content check failure(s):`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log("All content checks passed.");
