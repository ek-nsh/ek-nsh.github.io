// Screenshot whole pages as a series of viewport shots (so scroll reveals have fired).
//   node tests/e2e/tools/pages.mjs <width> <height> <maxShots> <path> [<path> ...]
// Uses the production preview on :4322 by default (BASE_URL env overrides).
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { OUT, launch, sleep } from '../config.mjs';

const [, , w = '1440', h = '900', max = '6', ...paths] = process.argv;
const base = process.env.BASE_URL ?? 'http://localhost:4322';
const browser = await launch(puppeteer, ['--force-device-scale-factor=1']);
const page = await browser.newPage();
await page.setViewport({ width: Number(w), height: Number(h), deviceScaleFactor: 1, isMobile: Number(w) < 700, hasTouch: Number(w) < 700 });
const problems = [];
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
page.on('console', (m) => m.type() === 'error' && problems.push(`[console] ${m.text()}`));

for (const p of paths) {
  await page.goto(base + p, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(2500);
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const slug = p.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home';
  // Walk down first so every reveal fires, then shoot on the way back up.
  for (let y = 0; y <= total; y += Number(h) * 0.6) {
    await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y);
    await sleep(260);
  }
  const shots = Math.min(Number(max), Math.ceil(total / Number(h)) + 1);
  for (let i = 0; i < shots; i++) {
    const y = Math.min(i * Number(h) * 0.92, total);
    await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y);
    await sleep(1400);
    const file = `pg-${w}-${slug}-${i + 1}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    console.log('saved', file, 'height', total + Number(h));
  }
}
console.log(problems.length ? 'PROBLEMS:\n' + [...new Set(problems)].join('\n') : 'no console problems');
await browser.close();
