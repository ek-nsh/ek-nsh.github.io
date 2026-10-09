// Scripted screenshots: node tests/e2e/shoot.mjs tests/e2e/plans/sections.json
//
// plan = { url, width, height, mobile?, initialWait?,
//          steps: [{ name?, scroll?: "selector" | number, offset?, wait?, mouse?: [x, y],
//                    click?: "selector", key?: "ArrowRight", eval?: "js", full? }] }
//
// Use this instead of the built-in preview pane for visual checks: that pane is only about
// 640px wide, so screenshots of a 1440px layout were unreliable.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { OUT, launch } from './config.mjs';

const plan = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const browser = await launch(puppeteer, ['--force-device-scale-factor=1']);
const page = await browser.newPage();
await page.setViewport({ width: plan.width ?? 1440, height: plan.height ?? 900, isMobile: !!plan.mobile, hasTouch: !!plan.mobile, deviceScaleFactor: 1 });

const problems = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && problems.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => problems.push(`[requestfailed] ${r.url()}`));

await page.goto(plan.url, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, plan.initialWait ?? 3500));

for (const s of plan.steps) {
  if (s.eval) {
    const res = await page.evaluate(s.eval);
    if (res !== undefined) console.log(`${s.name ?? 'step'} eval:`, JSON.stringify(res));
  }
  if (s.scroll !== undefined) {
    await page.evaluate(
      ({ target, offset }) => {
        const y = typeof target === 'number' ? target : document.querySelector(target).getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: y + (offset ?? 0), behavior: 'instant' });
      },
      { target: s.scroll, offset: s.offset },
    );
  }
  if (s.mouse) await page.mouse.move(s.mouse[0], s.mouse[1], { steps: 8 });
  if (s.click) await page.click(s.click);
  if (s.key) await page.keyboard.press(s.key);
  await new Promise((r) => setTimeout(r, s.wait ?? 1800));
  if (s.name) {
    await page.screenshot({ path: path.join(OUT, `${s.name}.png`), fullPage: !!s.full });
    console.log('saved', s.name);
  }
}

console.log(problems.length ? 'PROBLEMS:\n' + [...new Set(problems)].join('\n') : 'no console problems');
await browser.close();
