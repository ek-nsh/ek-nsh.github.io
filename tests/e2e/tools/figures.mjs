// Look at each interactive figure: a few frames over time, then after a tap.
//   node tests/e2e/tools/figures.mjs [slug ...]      (production preview on :4322)
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { OUT, launch, sleep } from '../config.mjs';

const base = process.env.BASE_URL ?? 'http://localhost:4322';
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['work/llm-hive', 'work/saas-financial-simulator', 'work/orbit', 'work/ev-route-optimizer', 'research'];
const browser = await launch(puppeteer, ['--force-device-scale-factor=1']);
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const problems = [];
page.on('pageerror', (e) => problems.push(e.message));

for (const slug of targets) {
  await page.goto(`${base}/${slug}`, { waitUntil: 'networkidle0' });
  await sleep(1500);
  const el = await page.$('.plate.live');
  await el.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sleep(1500);
  const box = await el.boundingBox();
  const name = slug.replace(/\W+/g, '-');
  for (let i = 0; i < 3; i++) {
    await el.screenshot({ path: path.join(OUT, `fig-${name}-${i}.png`) });
    await sleep(1700);
  }
  // A tap a third of the way in, a third down.
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.45, { steps: 6 });
  await page.mouse.click(box.x + box.width * 0.1, box.y + box.height * 0.3);
  await sleep(1800);
  await el.screenshot({ path: path.join(OUT, `fig-${name}-tap.png`) });
  console.log('shot', slug, JSON.stringify(box));
}
console.log(problems.length ? 'PROBLEMS: ' + problems.join(' | ') : 'no page errors');
await browser.close();
