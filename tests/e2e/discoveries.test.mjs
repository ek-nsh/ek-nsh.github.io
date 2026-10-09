// Hidden discoveries that need time or a mocked clock: node tests/e2e/discoveries.test.mjs
// Takes up to about a minute (it waits for the comet to cross the sky).
import puppeteer from 'puppeteer-core';
import { BASE, sleep, launch, reporter } from './config.mjs';

const { check, watch } = reporter();
const browser = await launch(puppeteer);
// A fresh context so localStorage starts empty.
const ctx = await browser.createBrowserContext();
const page = await ctx.newPage();
watch(page);
await page.setViewport({ width: 1440, height: 900 });

// ---- Night owl: pretend it is 2 am ----
await page.evaluateOnNewDocument(() => { Date.prototype.getHours = () => 2; });
await page.goto(BASE + '/', { waitUntil: 'load' });
await sleep(4500);
const owl = await page.evaluate(() => ({ toast: document.querySelector('.toast')?.textContent ?? '', saved: localStorage.getItem('ek:discoveries:v1') }));
check('opening after midnight is the "Night owl" discovery', owl.toast.includes('Night owl') && owl.saved.includes('nightowl'), JSON.stringify(owl));

// ---- Comet: wait for one to cross, then catch it ----
let found = false;
for (let i = 0; i < 90 && !found; i++) {
  found = await page.evaluate(() => !!document.querySelector('.comet'));
  if (!found) await sleep(500);
}
check('a comet crosses the sky within the first 45 seconds', found);
if (found) {
  // Click the element itself: this tests the catch logic, not human reflexes.
  await page.evaluate(() => document.querySelector('.comet').click());
  await sleep(500);
  const caught = await page.evaluate(() => ({ gone: !document.querySelector('.comet'), saved: localStorage.getItem('ek:discoveries:v1'), shards: document.querySelectorAll('.pixel-overlay').length }));
  check('clicking the comet bursts it into pixels and records the discovery', caught.gone && caught.saved.includes('comet') && caught.shards >= 1, JSON.stringify(caught));
}

// ---- Peek-a-boo: look away for 3 s, come back ----
await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { value: true, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
});
await sleep(3000);
await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
});
await sleep(400);
const peek = await page.evaluate(() => localStorage.getItem('ek:discoveries:v1'));
check('looking away and coming back is the "Peek-a-boo" discovery', peek.includes('peek'), peek);

// ---- Complete the set: preload five, then find the sixth on the 404 page ----
await page.evaluate(() => localStorage.setItem('ek:discoveries:v1', JSON.stringify(['supernova', 'comet', 'horizon', 'nightowl', 'peek'])));
await page.goto(BASE + '/zzz', { waitUntil: 'load' });
await sleep(2400);
const done = await page.evaluate(() => ({ toast: document.querySelector('.toast')?.textContent ?? '', slots: document.querySelectorAll('[data-disc-slots] .slot.is-found').length }));
check('the sixth discovery fills the last slot', done.slots === 6 && done.toast.includes('6/6'), JSON.stringify(done));
await sleep(4600);
const reward = await page.evaluate(() => document.querySelector('.toast')?.textContent ?? '');
check('finding all six is rewarded', reward.includes('All six found'), reward);

await browser.close();
