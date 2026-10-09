// Evaluate JS on a page and print the result.
//   MSYS_NO_PATHCONV=1 node tests/e2e/tools/probe.mjs /work "document.title" [width] [height]
// Uses the production preview on :4322 unless BASE_URL is set. In Git Bash the leading "/" needs
// MSYS_NO_PATHCONV=1, or it is rewritten into a Windows path.
import puppeteer from 'puppeteer-core';
import { launch, sleep } from '../config.mjs';

const [, , path = '/', js = '1', w = '1440', h = '900'] = process.argv;
const base = process.env.BASE_URL ?? 'http://localhost:4322';
const browser = await launch(puppeteer);
const page = await browser.newPage();
await page.setViewport({ width: Number(w), height: Number(h) });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(base + path, { waitUntil: 'networkidle0' });
await sleep(1500);
console.log(JSON.stringify(await page.evaluate(js), null, 1));
await browser.close();
