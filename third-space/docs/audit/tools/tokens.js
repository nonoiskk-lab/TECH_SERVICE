const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('https://www.perfectvenue.com/', { waitUntil: 'networkidle', timeout: 60000 });
  const d = await p.evaluate(() => {
    const cs = (e) => getComputedStyle(e);
    const vars = {};
    for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) { if (r.selectorText === ':root' || r.selectorText === 'html') for (const k of r.style) if (k.startsWith('--')) vars[k] = r.style.getPropertyValue(k).trim(); } } catch {} }
    const pick = (e) => { const s = cs(e); return { tag: e.tagName, cls: e.className.toString().slice(0,50), text: (e.innerText||'').trim().slice(0,40), font: s.fontFamily.slice(0,60), size: s.fontSize, weight: s.fontWeight, lh: s.lineHeight, ls: s.letterSpacing, color: s.color, bg: s.backgroundColor, radius: s.borderRadius, pad: s.padding, h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width), border: s.border, shadow: s.boxShadow, transition: s.transition, tt: s.textTransform } };
    const sample = (sel, n = 4) => [...document.querySelectorAll(sel)].filter(e => e.offsetParent).slice(0, n).map(pick);
    // colours by frequency
    const freq = { color: {}, bg: {}, border: {} };
    for (const e of document.querySelectorAll('body *')) { if (!e.offsetParent) continue; const s = cs(e); freq.color[s.color] = (freq.color[s.color]||0)+1; if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') freq.bg[s.backgroundColor] = (freq.bg[s.backgroundColor]||0)+1; if (s.borderTopWidth !== '0px') freq.border[s.borderTopColor] = (freq.border[s.borderTopColor]||0)+1; }
    const top = (o) => Object.entries(o).sort((a,b) => b[1]-a[1]).slice(0, 18);
    const grads = [...new Set([...document.querySelectorAll('body *')].map(e => cs(e).backgroundImage).filter(x => x.includes('gradient')))].slice(0, 8);
    const header = document.querySelector('nav, header, .navbar, [class*="nav"]');
    const navTree = [...document.querySelectorAll('.w-nav-menu > *, nav [class*="dropdown"], nav a')].slice(0, 60).map(e => ({ tag: e.tagName, cls: e.className.toString().slice(0, 40), text: (e.innerText||'').replace(/\s+/g,' ').trim().slice(0, 80), href: e.getAttribute('href') }));
    const footer = document.querySelector('footer, [class*="footer"]');
    const footerCols = footer ? [...footer.querySelectorAll('a')].map(a => ((a.innerText||'').trim() || a.getAttribute('aria-label') || '') + ' -> ' + a.getAttribute('href')) : [];
    const containers = [...document.querySelectorAll('[class*="container"]')].slice(0, 6).map(e => ({ cls: e.className.toString().slice(0,40), maxW: cs(e).maxWidth, w: Math.round(e.getBoundingClientRect().width), pad: cs(e).paddingLeft }));
    const sections = [...document.querySelectorAll('section, [class*="section"]')].filter(s => !s.parentElement.closest('section,[class*="section"]')).map(s => ({ cls: s.className.toString().slice(0,50), pt: cs(s).paddingTop, pb: cs(s).paddingBottom, bg: cs(s).backgroundColor, bgi: cs(s).backgroundImage.slice(0,60), h: Math.round(s.getBoundingClientRect().height), head: (s.querySelector('h1,h2,h3')?.innerText||'').trim().slice(0,70) }));
    const fonts = [...document.fonts].map(f => f.family + ' ' + f.weight + ' ' + f.status);
    return { vars, body: pick(document.body), h1: sample('h1',2), h2: sample('h2',4), h3: sample('h3',4), h4: sample('h4',3), p: sample('p',5), navLinks: sample('nav a, .nav-link, [class*="nav-link"]',6), buttons: sample('a[class*="button"], .button, button, [class*="btn"]',14), cards: sample('[class*="card"]',6), inputs: sample('input',3), colors: { text: top(freq.color), bg: top(freq.bg), border: top(freq.border) }, grads, navTree, footerCols, containers, sections, fonts: [...new Set(fonts)], header: header && pick(header) };
  });
  fs.writeFileSync('./audit-out/tokens-home.json', JSON.stringify(d, null, 1));
  await b.close();
})();
