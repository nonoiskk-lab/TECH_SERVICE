const { chromium } = require('playwright');
const fs = require('fs');
const all = fs.readFileSync('./audit-out/urls.txt','utf8').trim().split('\n');
const posts = all.filter(u => u.includes('/post/'));
const urls = [...all.filter(u => !u.includes('/post/')), ...posts.slice(0, 12)];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const out = [];
  let i = 0;
  async function worker() {
    const p = await ctx.newPage();
    while (i < urls.length) {
      const u = urls[i++];
      try {
        const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await p.waitForTimeout(800);
        const d = await p.evaluate(() => {
          const txt = (e) => (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 140);
          const main = document.body;
          const sections = [...document.querySelectorAll('section, [class*="section"]')].filter(s => !s.parentElement.closest('section,[class*="section"]')).map(s => ({ cls: (s.className||'').toString().slice(0,60), h: txt(s.querySelector('h1,h2,h3') || s).slice(0, 90), height: Math.round(s.getBoundingClientRect().height) }));
          const ctas = [...document.querySelectorAll('a,button')].filter(a => /button|btn|cta/i.test(a.className) ).map(a => ({ t: txt(a), href: a.getAttribute('href') })).filter(x => x.t).slice(0, 40);
          return {
            title: document.title,
            desc: document.querySelector('meta[name=description]')?.content || '',
            h1: [...document.querySelectorAll('h1')].map(txt),
            h2: [...document.querySelectorAll('h2')].map(txt).slice(0, 25),
            sections, ctas,
            forms: [...document.querySelectorAll('form')].map(f => [...f.querySelectorAll('input,select,textarea')].map(x => x.name || x.type)),
            iframes: [...document.querySelectorAll('iframe')].map(f => f.src.split('?')[0]),
            scripts: [...new Set([...document.querySelectorAll('script[src]')].map(s => { try { return new URL(s.src).host } catch { return '' } }))],
            imgs: document.querySelectorAll('img').length,
            videos: document.querySelectorAll('video').length,
            height: document.documentElement.scrollHeight,
            internal: [...new Set([...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith('https://www.perfectvenue.com')).map(h => h.split('#')[0].split('?')[0]))],
            external: [...new Set([...document.querySelectorAll('a[href^=http]')].map(a => { try { return new URL(a.href).host } catch { return '' } }).filter(h => h && !h.endsWith('perfectvenue.com')))],
            appLinks: [...new Set([...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => /app\.perfectvenue|help\.perfectvenue|calendly|hubspot/.test(h)))],
          };
        });
        out.push({ url: u, status: r ? r.status() : 0, ...d });
      } catch (e) { out.push({ url: u, status: 'ERR', err: String(e).slice(0, 120) }); }
      process.stdout.write('.');
    }
    await p.close();
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  fs.writeFileSync('./audit-out/crawl.json', JSON.stringify(out, null, 1));
  await b.close();
  console.log('\n', out.length, out.filter(o => o.status !== 200).map(o => o.url + ' ' + o.status));
})();
