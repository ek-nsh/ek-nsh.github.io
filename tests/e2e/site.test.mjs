// Main browser suite: node tests/e2e/site.test.mjs   (BASE=http://localhost:4322 for a built site)
//
// Covers the home page behaviours, the black-hole finale, the 404, reduced motion and a phone
// viewport. Takes about 2.5 minutes. The hidden discoveries that need long waits (comet, night owl)
// live in discoveries.test.mjs.
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { BASE, OUT, sleep, launch, reporter } from './config.mjs';

const { check, watch } = reporter();
const browser = await launch(puppeteer, ['--force-device-scale-factor=1']);

/** Count non-transparent pixels on a canvas: "is there artwork on it?" */
const litPixels = (page, sel) =>
  page.$eval(sel, (c) => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });

/* ===================== Desktop ===================== */
const page = await browser.newPage();
watch(page);
await page.setViewport({ width: 1440, height: 900 });
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await sleep(5500);

// ---- Hero: the white hole ----
check('white hole emits pixel shapes', (await litPixels(page, '[data-ejecta]')) > 30);
// The user disliked the orange circle around the core: no CSS ring or halo may come back.
const coreEl = await page.evaluate(() => ({
  tag: document.querySelector('[data-core]').tagName.toLowerCase(),
  rings: document.querySelectorAll('.hero .ring').length,
  halo: getComputedStyle(document.querySelector('[data-core]'), '::after').content,
}));
check('star core is a pixel sprite with no ring or halo', coreEl.tag === 'svg' && coreEl.rings === 0 && (coreEl.halo === 'none' || coreEl.halo === 'normal'), JSON.stringify(coreEl));
const letters = await page.$$eval('.hero-name .ch', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }));
await page.mouse.move(letters[2][0], letters[2][1], { steps: 10 });
await sleep(900);
const w = await page.$$eval('.hero-name .ch', (els) => els.map((e) => parseInt(getComputedStyle(e).fontWeight, 10)));
check('name letters thicken near the pointer', w[2] > 450 && w[2] > w[5] + 100, JSON.stringify(w));

// ---- Reticle cursor ----
const core = await page.$eval('[data-core-hit]', (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
await page.mouse.move(core[0], core[1], { steps: 8 });
await sleep(700);
let cur = await page.evaluate(() => ({ cls: document.querySelector('[data-cursor]').className, text: document.querySelector('.cursor-label').textContent, parts: ['.c-ring', '.c-tick', '.c-core', '.c-lock'].map((s) => !!document.querySelector(s)) }));
check('reticle cursor names the star core "Ignite"', cur.cls.includes('has-label') && cur.text === 'Ignite' && cur.parts.every(Boolean), JSON.stringify(cur));
const navLink = await page.$eval('.nav a', (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
await page.mouse.move(navLink[0], navLink[1], { steps: 8 });
await sleep(600);
cur = await page.evaluate(() => document.querySelector('[data-cursor]').className);
check('reticle opens over a link', cur.includes('is-link'), cur);

// ---- Supernova + discoveries ----
await page.mouse.move(core[0], core[1], { steps: 6 });
for (let i = 0; i < 3; i++) { await page.mouse.click(core[0], core[1]); await sleep(160); }
await sleep(600);
const nova = await page.evaluate(() => ({
  rings: document.querySelectorAll('.nova-ring').length,
  shards: document.querySelectorAll('.pixel-overlay').length,
  toast: document.querySelector('.toast')?.textContent ?? '',
  saved: window.localStorage.getItem('ek:discoveries:v1'),
  slots: document.querySelectorAll('[data-disc-slots] .slot.is-found').length,
}));
// (Between midnight and 5 am the "night owl" discovery fires on load, so the count may already be 2.)
check('three pokes: rings, pixel shrapnel, discovery toast, saved, slot filled',
  nova.rings >= 1 && nova.shards >= 1 && nova.toast.includes('Supernova') && (nova.saved ?? '').includes('supernova') && nova.slots >= 1, JSON.stringify(nova));
await sleep(3800);

// ---- Trajectory + reel + plates ----
await page.evaluate(() => document.getElementById('trajectory').scrollIntoView({ behavior: 'instant' }));
await sleep(4600);
const traj = await page.evaluate(() => ({ lit: document.querySelectorAll('.traj-dot.is-lit').length, total: document.querySelectorAll('.traj-dot').length }));
check('trajectory fully drawn', traj.lit === traj.total, JSON.stringify(traj));

await page.evaluate(() => document.getElementById('work').scrollIntoView({ behavior: 'instant' }));
await sleep(2200);
// Plates are built the first time they are on screen (to keep page load light), so visit each mission.
const items = await page.$$('[data-reel-item]');
const plates = [];
for (const it of items) {
  await it.hover();
  await sleep(1000);
  plates.push(await page.$eval('[data-active] [data-plate]', (c) => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n;
  }));
}
check('each of the four mission plates draws its artwork when it takes the stage', plates.length === 4 && plates.every((n) => n > 40), JSON.stringify(plates));
await items[2].hover();
await sleep(900);
const act = await page.evaluate(() => ({ card: [...document.querySelectorAll('[data-reel-card]')].findIndex((e) => e.hasAttribute('data-active')), paused: document.querySelector('[data-reel]').classList.contains('is-paused'), hasChips: !!document.querySelector('.rc-chips, .rc-cols') }));
check('reel hover switches mission; no tech-stack chips remain', act.card === 2 && act.paused && !act.hasChips, JSON.stringify(act));
const frame = await page.$('[data-active] [data-plate-frame]');
const fb = await frame.boundingBox();
await page.mouse.move(fb.x + fb.width * 0.25, fb.y + fb.height * 0.7, { steps: 6 });
await sleep(500);
const read = await page.$eval('[data-active] [data-readout]', (e) => e.textContent);
check('plate crosshair reads out the pointer position', /x 0\.2\d · y 0\.[67]\d/.test(read), read);

// ---- Research teaser plate, then the desk ----
await page.evaluate(() => document.getElementById('research').scrollIntoView({ behavior: 'instant' }));
await sleep(1800);
const teaser = await page.$eval('#research [data-plate]', (c) => {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n;
});
check('the research teaser plate draws once it is on screen', teaser > 100, String(teaser));
await page.evaluate(() => document.getElementById('lab').scrollIntoView({ behavior: 'instant' }));
await sleep(7000);
const desk = await page.evaluate(() => ({
  pieces: document.querySelectorAll('.board .piece').length,
  gone: document.querySelectorAll('.board .piece.gone').length,
  termText: document.querySelector('[data-now-text]').textContent.length,
  spines: document.querySelectorAll('.spine').length,
}));
check('chess game is on the board and progressing', desk.pieces === 32 && desk.termText > 5 && desk.spines === 5, JSON.stringify(desk));
check('gravity toy has bodies orbiting', (await litPixels(page, '[data-toy]')) > 25);
const spine = await page.$('.spine:nth-child(1)');
await spine.hover();
await sleep(400);
const take = await page.$eval('[data-shelf-take]', (e) => e.textContent);
check('hovering a spine shows its one-line take', take.includes('margin-note style'), take);
const box = await (await page.$('[data-toy]')).boundingBox();
await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.3);
await sleep(300);
check('clicking the gravity toy does not break it', (await litPixels(page, '[data-toy]')) > 15);

// ---- Writing list ----
const rows = await page.evaluate(() => [...document.querySelectorAll('#writing .post-row')].map((r) => ({
  href: r.getAttribute('href'),
  // the tag line must sit under the description (it once jumped above the date when a shared class collided)
  metaBelow: r.querySelector('.meta').getBoundingClientRect().top > r.querySelector('.body').getBoundingClientRect().top,
})));
check('home lists the new post, with its tag line under the text', rows.length === 1 && rows[0].href.endsWith('/writing/introduction-to-mechanistic-interpretability') && rows[0].metaBelow, JSON.stringify(rows));
check('post has a pixel glyph', (await litPixels(page, '[data-glyph]')) > 3);

// ---- Finale: the black hole's dark spreads ----
await page.mouse.move(40, 40);
// While the disc is small it must be a clean dot: the words stay invisible until it has opened.
// The dark waits for the first quarter of the runway, then opens as a plain black disc.
await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight - innerHeight - 0.9 * 900, behavior: 'instant' }));
await sleep(1200);
const early = await page.evaluate(() => parseFloat(document.querySelector('[data-finale]').style.getPropertyValue('--r')));
check('the dark has not started yet while the last content is still on screen', early === 0, String(early));
await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight - innerHeight - 0.69 * 900, behavior: 'instant' }));
await sleep(1400);
const dot = await page.evaluate(() => {
  const f = document.querySelector('[data-finale]');
  return {
    r: parseFloat(f.style.getPropertyValue('--r')),
    inner: parseFloat(getComputedStyle(document.querySelector('[data-finale-inner]')).opacity),
    cta: parseFloat(getComputedStyle(document.querySelector('[data-hole-cta] .fade')).opacity),
    hole: parseFloat(getComputedStyle(document.querySelector('[data-hole-canvas]')).opacity),
  };
});
check('small dark disc is a plain black circle: no text or pixel noise inside it', dot.r > 5 && dot.r < 90 && dot.inner < 0.05 && dot.cta < 0.05 && dot.hole < 0.05, JSON.stringify(dot));
await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight - innerHeight - 0.5 * 900, behavior: 'instant' }));
await sleep(1600);
const mid = await page.evaluate(() => ({ r: parseFloat(document.querySelector('[data-finale]').style.getPropertyValue('--r')), edge: getComputedStyle(document.querySelector('[data-edge]')).display, clip: getComputedStyle(document.querySelector('[data-finale]')).clipPath }));
check('halfway: a disc of dark has opened around the hole', mid.r > 150 && mid.edge === 'block' && mid.clip.includes('circle'), JSON.stringify(mid));
await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
await sleep(2600);
const end = await page.evaluate(() => ({
  hdr: [...document.querySelectorAll('[data-hdr]')].every((e) => e.classList.contains('on-dark') || e.getBoundingClientRect().width === 0),
  edge: getComputedStyle(document.querySelector('[data-edge]')).display,
  holeLit: (() => { const c = document.querySelector('[data-hole-canvas]'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; })(),
}));
check('at the end: header turned light, edge gone, black hole drawn', end.hdr && end.edge === 'none' && end.holeLit > 1500, JSON.stringify(end));

const cta = await page.$eval('[data-hole-cta]', (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]; });
await page.mouse.move(cta[0] + 60, cta[1] + 60, { steps: 6 });
await page.mouse.move(cta[0], cta[1], { steps: 10 });
await sleep(900);
cur = await page.evaluate(() => ({ cls: document.querySelector('[data-cursor]').className, label: document.querySelector('.cursor-label').textContent, lw: getComputedStyle(document.querySelector('[data-cursor]')).getPropertyValue('--lw') }));
check('cursor locks onto the black hole with corner brackets', cur.cls.includes('is-lock') && cur.cls.includes('on-dark') && cur.label === 'Fall in' && parseFloat(cur.lw) > cta[2], JSON.stringify(cur));
await page.screenshot({ path: path.join(OUT, 'lock-on.png') });

const copy = await page.$('[data-copy]');
await copy.click();
await sleep(500);
const copied = await page.$eval('[data-copy-text]', (e) => e.textContent);
check('email pill copies (or asks for Ctrl+C) with feedback', /copied|Ctrl\+C/.test(copied), copied);

// Stop the real mailto navigation, then click the hole.
await page.evaluate(() => window.addEventListener('click', (e) => e.target.closest('[data-hole-cta]') && e.preventDefault(), true));
await page.mouse.click(cta[0], cta[1]);
await sleep(300);
const hz = await page.evaluate(() => window.localStorage.getItem('ek:discoveries:v1'));
check('using the black hole counts as the "horizon" discovery', (hz ?? '').includes('horizon'), hz);

// ---- Recruiter tour through the sections ----
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await sleep(3500);
await page.click('[data-tour-start]');
await sleep(4800);
for (let i = 0; i < 5; i++) { await page.keyboard.press('ArrowRight'); await sleep(i === 4 ? 6500 : 4600); }
const step = await page.evaluate(() => document.querySelector('[data-rm-kicker]').textContent.trim());
check('recruiter tour reaches step 6 of 6', step === '06 / 06', step);
await page.screenshot({ path: path.join(OUT, 'tour-final.png') });
await page.keyboard.press('Escape');

// ---- 404 ----
const res = await page.goto(BASE + '/nope', { waitUntil: 'networkidle0' });
await sleep(3000);
check('404 shows a pixel black hole and counts as "lost"', res.status() === 404 && (await litPixels(page, '[data-lost-hole]')) > 800 && ((await page.evaluate(() => window.localStorage.getItem('ek:discoveries:v1'))) ?? '').includes('lost'));
await page.screenshot({ path: path.join(OUT, '404.png') });

/* ===================== Reduced motion ===================== */
const rm = await browser.newPage();
watch(rm);
await rm.setViewport({ width: 1440, height: 900 });
await rm.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await rm.goto(BASE + '/', { waitUntil: 'networkidle0' });
await sleep(3000);
const reduced = await rm.evaluate(() => ({
  finale: getComputedStyle(document.querySelector('[data-finale]')).position,
  runway: getComputedStyle(document.querySelector('[data-page]')).marginBottom,
  holeLit: (() => { const c = document.querySelector('[data-hole-canvas]'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; })(),
  heroVisible: getComputedStyle(document.querySelector('.hero-name')).visibility,
  cards: [...document.querySelectorAll('[data-reveal]')].every((e) => getComputedStyle(e).opacity === '1'),
}));
check('reduced motion: finale is a plain section, hole drawn still, content visible', reduced.finale === 'relative' && reduced.runway === '0px' && reduced.holeLit > 1500 && reduced.heroVisible === 'visible' && reduced.cards, JSON.stringify(reduced));

/* ===================== Phone ===================== */
// Close the busy desktop pages first so the phone run is not starved of CPU.
await page.close();
await rm.close();
const ph = await browser.newPage();
watch(ph);
await ph.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
for (const url of ['/', '/trajectory/', '/work/', '/work/llm-hive/', '/research/', '/lab/', '/writing/', '/writing/introduction-to-mechanistic-interpretability/', '/nope']) {
  await ph.goto(BASE + url, { waitUntil: 'load', timeout: 60000 });
  await sleep(2600);
  const m = await ph.evaluate(() => ({ doc: document.documentElement.scrollWidth, vw: innerWidth }));
  check(`phone: no horizontal overflow on ${url}`, m.doc <= m.vw + 1, JSON.stringify(m));
}
await ph.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
await sleep(3000);
await ph.evaluate(() => document.getElementById('lab').scrollIntoView({ behavior: 'instant' }));
await sleep(2500);
await ph.screenshot({ path: path.join(OUT, 'phone-desk.png') });
await ph.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
await sleep(2800);
await ph.screenshot({ path: path.join(OUT, 'phone-finale.png') });
// Self-checking: the dark must reach the farthest corner from the hole.
const cover = await ph.evaluate(() => {
  const f = document.querySelector('[data-finale]');
  const r = parseFloat(f.style.getPropertyValue('--r'));
  const cx = parseFloat(f.style.getPropertyValue('--cx'));
  const cy = parseFloat(f.style.getPropertyValue('--cy'));
  return { r: Math.round(r), farthestCorner: Math.round(Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy))) };
});
check('phone: the dark has spread across the whole screen at the end', cover.r >= cover.farthestCorner, JSON.stringify(cover));

await browser.close();
