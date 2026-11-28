const { chromium } = require('playwright');
const fs = require('fs');
const B = 'https://www.perfectvenue.com';
(async () => {
  const b = await chromium.launch(); const out = {};
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const st = (sel) => p.$eval(sel, e => { const s = getComputedStyle(e); return { bg: s.backgroundColor, color: s.color, border: s.borderColor, transform: s.transform, shadow: s.boxShadow, opacity: s.opacity }; }).catch(() => null);
  await p.goto(B + '/', { waitUntil: 'networkidle' });
  await p.locator('text=Accept All Cookies').first().click({ timeout: 2000 }).catch(() => {});
  out.webflowIX = await p.evaluate(() => ({ dataWId: document.querySelectorAll('[data-w-id]').length, hiddenInitially: [...document.querySelectorAll('[data-w-id]')].filter(e => e.style.opacity === '0' || /translate/.test(e.style.transform)).length, sample: [...document.querySelectorAll('[data-w-id]')].slice(0, 8).map(e => ({ cls: e.className.toString().slice(0, 40), style: e.getAttribute('style') })), sliders: document.querySelectorAll('.w-slider').length, tabs: document.querySelectorAll('.w-tabs').length, dropdowns: document.querySelectorAll('.w-dropdown').length, lottie: document.querySelectorAll('[data-animation-type="lottie"]').length, videos: [...document.querySelectorAll('video,iframe')].map(v => v.tagName + ' ' + (v.src || v.currentSrc || '').slice(0, 80)) }));
  // hovers
  out.hover = {};
  for (const sel of ['.c-nav_button-is--red2', '.c-nav_button-is--white', '.hero-button', '.hero-button-outline', '.button-outline-dark', '.nav-link-2']) {
    const before = await st(sel); await p.hover(sel).catch(() => {}); await p.waitForTimeout(600); const after = await st(sel);
    out.hover[sel] = { before, after }; await p.mouse.move(0, 0); await p.waitForTimeout(300);
  }
  // sticky nav
  await p.evaluate(() => window.scrollTo(0, 3000)); await p.waitForTimeout(800);
  out.navAfterScroll = await p.evaluate(() => { const n = document.querySelector('.w-nav'); const r = n.getBoundingClientRect(); return { pos: getComputedStyle(n).position, top: r.top, visible: r.bottom > 0 }; });
  await p.screenshot({ path: './audit-out/shots/ix-desktop-scrolled.jpg', type: 'jpeg', quality: 60 });
  // FAQ structure
  out.faq = await p.evaluate(() => { const h = [...document.querySelectorAll('h2,h3')].find(x => /Frequently/.test(x.innerText)); const s = h && h.closest('section,[class*="section"]'); return s ? { details: s.querySelectorAll('details').length, dropdowns: s.querySelectorAll('.w-dropdown').length, buttons: s.querySelectorAll('button,[role=button]').length, alwaysOpen: true } : null; });
  // pricing toggle + slider
  await p.goto(B + '/pricing', { waitUntil: 'networkidle' });
  const priceText = () => p.evaluate(() => [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /^\$\d/.test(e.innerText || '')).slice(0, 6).map(e => e.innerText));
  out.pricing = { annual: await priceText() };
  await p.getByText('Monthly Billing', { exact: true }).first().click().catch(e => out.pricing.err = String(e).slice(0, 80)); await p.waitForTimeout(700);
  out.pricing.monthly = await priceText();
  out.pricing.tabs = await p.evaluate(() => document.querySelectorAll('.w-tabs').length);
  out.slider = await p.evaluate(() => { const s = document.querySelector('.w-slider'); return s ? { autoplay: s.getAttribute('data-autoplay'), delay: s.getAttribute('data-delay'), anim: s.getAttribute('data-animation'), dur: s.getAttribute('data-duration'), slides: s.querySelectorAll('.w-slide').length, arrows: s.querySelectorAll('.w-slider-arrow-left,.w-slider-arrow-right').length, dots: s.querySelectorAll('.w-slider-dot').length } : null; });
  // demo form validation (no submission: required fields empty → browser blocks)
  await p.goto(B + '/demo-request', { waitUntil: 'networkidle' });
  out.form = await p.evaluate(() => { const f = document.querySelector('form'); if (!f) return null; return { action: f.getAttribute('action'), method: f.method, fields: [...f.querySelectorAll('input,select,textarea')].filter(i => i.type !== 'hidden').map(i => ({ name: i.name || i.id, type: i.type, required: i.required, ph: i.placeholder })), submit: f.querySelector('[type=submit]')?.value || f.querySelector('[type=submit]')?.innerText, success: !!document.querySelector('.w-form-done'), fail: !!document.querySelector('.w-form-fail') }; });
  if (out.form) { await p.locator('form [type=submit]').first().click(); await p.waitForTimeout(500); out.form.afterEmptySubmit = await p.evaluate(() => ({ invalid: [...document.querySelectorAll('form :invalid')].map(e => e.name || e.id).slice(0, 8), msg: document.querySelector('form :invalid')?.validationMessage, url: location.pathname, inputStyle: (() => { const i = document.querySelector('form input:not([type=hidden])'); const s = getComputedStyle(i); return { h: i.getBoundingClientRect().height, bg: s.backgroundColor, border: s.border, radius: s.borderRadius, font: s.fontSize, pad: s.padding }; })(), labelStyle: (() => { const l = document.querySelector('form label'); if (!l) return null; const s = getComputedStyle(l); return { font: s.fontSize, weight: s.fontWeight, color: s.color }; })() })); }
  // free trial + concierge
  for (const path of ['/free-trial', '/concierge']) { const r = await p.goto(B + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500); out[path] = { finalUrl: p.url(), status: r && r.status(), text: (await p.evaluate(() => document.body.innerText)).slice(0, 300), iframes: await p.evaluate(() => [...document.querySelectorAll('iframe')].map(f => f.src.slice(0, 90))) }; }
  // mobile menu
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await m.newPage(); await mp.goto(B + '/', { waitUntil: 'networkidle' });
  await mp.locator('text=Accept All Cookies').first().click({ timeout: 2000 }).catch(() => {});
  out.mobileNav = await mp.evaluate(() => { const btn = document.querySelector('.w-nav-button'); const s = getComputedStyle(btn); const r = btn.getBoundingClientRect(); return { w: r.width, h: r.height, display: s.display, menuDisplay: getComputedStyle(document.querySelector('.w-nav-menu')).display, navPos: getComputedStyle(document.querySelector('.w-nav')).position, anim: document.querySelector('.w-nav').getAttribute('data-animation'), dur: document.querySelector('.w-nav').getAttribute('data-duration') }; });
  await mp.locator('.w-nav-button').first().tap(); await mp.waitForTimeout(900);
  out.mobileNav.open = await mp.evaluate(() => ({ overlay: !!document.querySelector('.w-nav-overlay') && getComputedStyle(document.querySelector('.w-nav-overlay')).display, links: [...document.querySelectorAll('.w-nav-overlay a')].map(a => a.innerText.trim()).filter(Boolean), height: document.querySelector('.w-nav-overlay')?.getBoundingClientRect().height }));
  await mp.screenshot({ path: './audit-out/shots/ix-mobile-menu-open.jpg', type: 'jpeg', quality: 60 });
  // tablet nav
  const t = await b.newContext({ viewport: { width: 768, height: 1024 }, hasTouch: true }); const tp = await t.newPage(); await tp.goto(B + '/', { waitUntil: 'networkidle' });
  out.tabletNav = await tp.evaluate(() => ({ burger: getComputedStyle(document.querySelector('.w-nav-button')).display, h1: getComputedStyle(document.querySelector('h1')).fontSize }));
  out.mobileType = await mp.evaluate(() => Object.fromEntries(['h1', 'h2', 'h3', 'p'].map(s => { const e = document.querySelector(s); const c = getComputedStyle(e); return [s, c.fontSize + '/' + c.lineHeight]; })));
  fs.writeFileSync('./audit-out/ix.json', JSON.stringify(out, null, 1)); await b.close();
})();
