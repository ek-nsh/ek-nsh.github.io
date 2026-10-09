// Research tool: how does a reference site behave? node tests/e2e/tools/inspect-reference-site.mjs [url]
// Used on https://josephle.dev/ (the default). Reports, in order:
//   1. nine fast screenshots of the load sequence (j-intro-0..8.png in tests/e2e/shots)
//   2. @keyframes names, :hover rules and blend/clip rules found in the stylesheets
//   3. whether document.title changes when the tab is hidden
//   4. which interesting strings appear in its JavaScript bundles
//   5. which links/buttons change computed style on hover (and how many elements change)
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { OUT, sleep, launch } from '../config.mjs';

const URL_ = process.argv[2] ?? 'https://josephle.dev/';
const browser = await launch(puppeteer);
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text().slice(0, 200)}`));

// 1. Intro frames (fast, before network idle)
await page.goto(URL_, { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 9; i++) {
  await page.screenshot({ path: path.join(OUT, `j-intro-${i}.png`), clip: { x: 0, y: 0, width: 1440, height: 900 } });
  await sleep(220);
}
await sleep(3500);

// 2. Static analysis of CSS
const css = await page.evaluate(() => {
  const keyframes = new Set();
  const hovers = [];
  const misc = new Set();
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = [...sheet.cssRules]; } catch { continue; }
    const walk = (rs) =>
      rs.forEach((r) => {
        if (r.type === CSSRule.KEYFRAMES_RULE) keyframes.add(r.name);
        else if (r.cssRules && r.type !== CSSRule.STYLE_RULE) walk([...r.cssRules]);
        else if (r.selectorText && /:hover|group-hover/.test(r.selectorText)) hovers.push(r.selectorText.slice(0, 110) + ' {' + r.style.cssText.slice(0, 120) + '}');
        if (r.cssText && /mix-blend-mode|backdrop-filter|clip-path|view-transition/.test(r.cssText)) misc.add((r.selectorText || r.cssText).slice(0, 90));
      });
    walk(rules);
  }
  return { keyframes: [...keyframes], hoverCount: hovers.length, hovers: hovers.slice(0, 40), misc: [...misc].slice(0, 15) };
});
console.log('KEYFRAMES', JSON.stringify(css.keyframes));
console.log('HOVER RULES', css.hoverCount);
css.hovers.forEach((h) => console.log('  ', h));
console.log('BLEND/CLIP', JSON.stringify(css.misc));

// 3. Title behaviour when the tab is hidden
const titles = await page.evaluate(async () => {
  const before = document.title;
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  Object.defineProperty(document, 'hidden', { value: true, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
  await new Promise((r) => setTimeout(r, 400));
  const during = document.title;
  window.dispatchEvent(new Event('blur'));
  await new Promise((r) => setTimeout(r, 400));
  return { before, during, afterBlur: document.title };
});
console.log('TITLE', JSON.stringify(titles));

// 4. Scan JS bundles for hints of hidden behaviour
const hits = await page.evaluate(async () => {
  const srcs = [...document.scripts].map((s) => s.src).filter((s) => s.includes('/_next/'));
  const keys = ['konami', 'console.log', 'document.title', 'visibilitychange', 'magnetic', 'scramble', 'SplitText', 'keydown', 'prefers-reduced-motion', 'Intl.DateTimeFormat', 'sessionStorage', 'localStorage', 'mix-blend', 'ScrollTrigger.create', 'scrub', 'pin:', 'rotate', 'cursor'];
  const res = {};
  for (const s of srcs) {
    const t = await (await fetch(s)).text();
    const found = keys.filter((k) => t.includes(k));
    if (found.length) res[s.split('/').pop()] = found;
  }
  return res;
});
console.log('BUNDLE HINTS', JSON.stringify(hits));

// 5. Hover diffs on interesting elements
for (const sel of ['header a', 'nav a', 'main a', 'main button', '[class*="group"]', 'footer a', 'footer button']) {
  const handles = await page.$$(sel);
  for (let i = 0; i < Math.min(handles.length, 3); i++) {
    const h = handles[i];
    const box = await h.boundingBox();
    if (!box || box.width < 4 || box.height < 4) continue;
    await h.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await sleep(500);
    const snap = () =>
      h.evaluate((el) => {
        const pick = (e) => { const c = getComputedStyle(e); return [c.color, c.backgroundColor, c.transform, c.opacity, c.borderColor, c.boxShadow.slice(0, 40), c.width, c.fontWeight, c.letterSpacing, c.textDecorationLine].join('|'); };
        return [pick(el), ...[...el.querySelectorAll('*')].slice(0, 12).map(pick)].join('\n');
      });
    await page.mouse.move(5, 5);
    await sleep(500);
    const before = await snap();
    const b2 = await h.boundingBox();
    await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2, { steps: 4 });
    await sleep(800);
    const after = await snap();
    if (before !== after) {
      const txt = await h.evaluate((el) => (el.textContent || '').trim().slice(0, 30));
      const changed = after.split('\n').filter((l, idx) => l !== before.split('\n')[idx]).length;
      console.log(`HOVER CHANGES: ${sel}[${i}] "${txt}" changed ${changed} element(s)`);
    }
  }
}

console.log('CONSOLE', JSON.stringify(logs.slice(0, 12)));
await browser.close();
