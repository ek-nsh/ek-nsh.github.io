// Frame timing under a 4x CPU throttle: node tests/e2e/perf.mjs
// Prints median / 95th-percentile / worst frame time in the hero, at the desk and in the finale,
// plus any main-thread task over 50 ms. A 144 Hz display shows as ~7 ms frames.
import puppeteer from 'puppeteer-core';
import { BASE, sleep, launch } from './config.mjs';

const browser = await launch(puppeteer);
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const cdp = await page.createCDPSession();
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.evaluateOnNewDocument(() => {
  window.__lt = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true });
});
await page.goto(BASE + '/', { waitUntil: 'load' });
await sleep(6000);

const frames = (n = 90) =>
  page.evaluate(
    (n) =>
      new Promise((res) => {
        const t = [];
        let last = performance.now();
        const step = (now) => {
          t.push(now - last);
          last = now;
          if (t.length < n) requestAnimationFrame(step);
          else {
            const s = [...t].sort((a, b) => a - b);
            res({ median: +s[Math.floor(n / 2)].toFixed(1), p95: +s[Math.floor(n * 0.95)].toFixed(1), max: +s[n - 1].toFixed(1) });
          }
        };
        requestAnimationFrame(step);
      }),
    n,
  );

console.log('hero   (4x CPU throttle):', JSON.stringify(await frames()));
await page.evaluate(() => document.getElementById('lab').scrollIntoView({ behavior: 'instant' }));
await sleep(2500);
console.log('desk   (4 live objects): ', JSON.stringify(await frames()));
await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
await sleep(3000);
console.log('finale (black hole):     ', JSON.stringify(await frames()));
console.log('long tasks over 50 ms (ms):', JSON.stringify(await page.evaluate(() => window.__lt)));

// The interactive figures on the project and research pages (the busiest is the EV route map).
for (const slug of ['work/llm-hive', 'work/saas-financial-simulator', 'work/orbit', 'work/ev-route-optimizer', 'research']) {
  await page.goto(`${BASE}/${slug}/`, { waitUntil: 'load' });
  await sleep(2500);
  await page.evaluate(() => document.querySelector('.plate.live').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sleep(1500);
  console.log(`figure ${slug.padEnd(30)}`, JSON.stringify(await frames()));
}
await browser.close();
