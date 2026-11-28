const { chromium } = require('playwright');
const fs = require('fs');
const B = 'https://www.perfectvenue.com';
const pages = ['/', '/features', '/pricing', '/ai-reply', '/industries-we-serve', '/industries/bars', '/integrations-and-partnerships', '/integrations-and-partnerships/7shifts', '/about-us', '/customer-success', '/customer-spotlight/bacari', '/blog', '/post/5-easy-and-free-tips-to-get-more-event-inquiries', '/contact-us', '/contact-sales', '/demo-request', '/free-trial', '/perfect-venue-vs-tripleseat', '/marketplace', '/careers', '/webinars', '/free-beo-template', '/perfect-venue-reviews', '/concierge', '/privacy-policy', '/support-request', '/category/news', '/blog-tags/payments', '/webinar/express-book-webinar'];
const vps = { desktop: [1440, 900], laptop: [1366, 768], tablet: [768, 1024], mobile: [390, 844] };
const only = process.argv[2] ? process.argv[2].split(',') : Object.keys(vps);
(async () => {
  const b = await chromium.launch();
  const meta = {};
  for (const [name, [w, h]] of Object.entries(vps)) {
    if (!only.includes(name)) continue;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: name === 'mobile', hasTouch: name !== 'desktop' && name !== 'laptop' });
    await ctx.addCookies([]);
    let i = 0;
    async function worker() {
      const p = await ctx.newPage();
      while (i < pages.length) {
        const path = pages[i++];
        const slug = path === '/' ? 'home' : path.slice(1).replace(/\//g, '__');
        try {
          await p.goto(B + path, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
          // dismiss cookie banner if present (observed element, not a guess)
          await p.locator('text=Accept All Cookies').first().click({ timeout: 1500 }).catch(() => {});
          // scroll through to trigger Webflow scroll-in interactions and lazy images
          await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
          await p.waitForTimeout(800);
          const m = await p.evaluate(() => {
            const cs = getComputedStyle;
            const secs = [...document.querySelectorAll('section, [class*="section"], footer, [class*="footer"]')].filter(s => !s.parentElement.closest('section,[class*="section"],footer,[class*="footer"]') && s.getBoundingClientRect().height > 30).map(s => { const r = s.getBoundingClientRect(); const st = cs(s); return { cls: s.className.toString().slice(0, 40), top: Math.round(r.top + scrollY), h: Math.round(r.height), bg: st.backgroundColor, pt: st.paddingTop, pb: st.paddingBottom, head: (s.querySelector('h1,h2,h3')?.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 70), cols: (() => { const g = s.querySelector('.w-layout-grid, [class*="grid"], .w-row'); return g ? cs(g).gridTemplateColumns || 'row' : '' })(), imgs: s.querySelectorAll('img').length } });
            const h1 = document.querySelector('h1');
            const nav = document.querySelector('.w-nav');
            return { H: document.documentElement.scrollHeight, overflowX: document.documentElement.scrollWidth > innerWidth, h1: h1 && { size: cs(h1).fontSize, lh: cs(h1).lineHeight, font: cs(h1).fontFamily.split(',')[0], w: Math.round(h1.getBoundingClientRect().width) }, navPos: nav && cs(nav).position, burger: !!document.querySelector('.w-nav-button') && cs(document.querySelector('.w-nav-button')).display !== 'none', secs };
          });
          meta[`${name}:${path}`] = m;
          await p.screenshot({ path: `./audit-out/shots/${name}-${slug}.jpg`, fullPage: true, type: 'jpeg', quality: 55 });
        } catch (e) { meta[`${name}:${path}`] = { err: String(e).slice(0, 150) }; }
        process.stdout.write(name[0]);
      }
      await p.close();
    }
    await Promise.all([worker(), worker(), worker(), worker()]);
    await ctx.close();
  }
  fs.writeFileSync(`./audit-out/shots-meta-${only.join('_')}.json`, JSON.stringify(meta, null, 1));
  await b.close();
})();
