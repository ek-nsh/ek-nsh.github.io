// Main-thread tasks over 50 ms while each page loads, at a 4x CPU throttle.
//   node tests/e2e/tools/longtasks.mjs /nope / /work /lab      (production preview on :4322)
import puppeteer from 'puppeteer-core';
import { launch, sleep } from '../config.mjs';

const base = process.env.BASE_URL ?? 'http://localhost:4322';
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ['/nope', '/', '/work', '/lab', '/work/ev-route-optimizer'];
const browser = await launch(puppeteer);

for (const p of paths) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.THROTTLE ?? 4) });
  await page.evaluateOnNewDocument(() => {
    window.__lt = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(`${Math.round(e.startTime)}+${Math.round(e.duration)}`))).observe({ type: 'longtask', buffered: true });
  });
  await page.goto(base + p, { waitUntil: 'load' });
  await sleep(6000);
  console.log(p.padEnd(26), JSON.stringify(await page.evaluate(() => window.__lt)), ' (start+duration, ms)');
  await page.close();
}
await browser.close();
