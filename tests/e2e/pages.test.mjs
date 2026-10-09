// Page-level checks for the multi-page site: node tests/e2e/pages.test.mjs   (BASE=http://localhost:4322 for a built site)
//
// Navigation, real content (no placeholders), every internal link, the Work star chart, the project
// pages and their interactive figures, the research page, the trajectory, the lab and the blog post.
import puppeteer from 'puppeteer-core';
import { BASE, sleep, launch, reporter } from './config.mjs';

const { check, watch } = reporter();
const browser = await launch(puppeteer, ['--force-device-scale-factor=1']);
const page = await browser.newPage();
watch(page);
await page.setViewport({ width: 1440, height: 900 });

const go = async (url, wait = 2200) => {
  await page.goto(BASE + url, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(wait);
};

/** A number that changes whenever the canvas picture changes. */
const hash = (sel) =>
  page.$eval(sel, (c) => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let h = 0;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) { n++; h = (h * 31 + i) % 1000000007; }
    return { h, n };
  });

const PAGES = ['/', '/trajectory', '/work', '/work/llm-hive', '/work/saas-financial-simulator', '/work/orbit', '/work/ev-route-optimizer', '/research', '/lab', '/writing', '/writing/introduction-to-mechanistic-interpretability'];

/* ---------- Navigation ---------- */
await go('/work/');
const nav = await page.$$eval('.nav a', (as) => as.map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href'), current: a.getAttribute('aria-current') })));
check('header: About, Trajectory, Work, Research, Writing, Lab in that order', nav.map((n) => n.text).join() === 'About,Trajectory,Work,Research,Writing,Lab', nav.map((n) => n.text).join());
check('header: each item leads to its own page, and Work is marked current',
  nav.slice(1).every((n) => n.href === '/' + n.text.toLowerCase()) && nav.filter((n) => n.current).length === 1 && nav.find((n) => n.text === 'Work').current === 'page', JSON.stringify(nav));

/* ---------- Real content, every link ---------- */
const bad = [];
const links = new Set();
for (const p of PAGES) {
  const html = await (await fetch(BASE + p)).text();
  for (const word of ['Placeholder', '20XX', 'example.com', 'Lorem', 'Project One']) if (html.includes(word)) bad.push(`${p}: ${word}`);
  for (const m of html.matchAll(/href="(\/[^"#]*)/g)) links.add(m[1]);
}
check('no placeholder text on any page', bad.length === 0, bad.join(' | '));
const broken = [];
for (const l of links) {
  if (l.startsWith('/_astro') || l.endsWith('.svg') || l.endsWith('.png')) continue;
  const r = await fetch(BASE + l);
  if (r.status !== 200) broken.push(`${l} ${r.status}`);
}
check(`every internal link resolves (${links.size} checked)`, broken.length === 0, broken.join(' | '));

/* ---------- Work: the star chart ---------- */
await go('/work/');
const chart = await page.evaluate(() => ({
  stars: document.querySelectorAll('[data-star]').length,
  majors: document.querySelectorAll('[data-star].major, [data-star].research').length,
  links: document.querySelectorAll('[data-links] [data-link]').length,
  rows: document.querySelectorAll('.cat-row').length,
}));
check('chart: 9 stars (4 missions, 1 research, 4 smaller bodies), thread lines drawn, catalogue lists 5', chart.stars === 9 && chart.majors === 5 && chart.links === 3 && chart.rows === 5, JSON.stringify(chart));

await page.hover('[data-id="llm-hive"]');
await sleep(500);
const hov = await page.evaluate(() => ({ title: document.querySelector('[data-r-title]').textContent, on: document.querySelectorAll('[data-link].is-on').length, cursor: document.querySelector('[data-cursor]').className }));
check('chart: hovering a star fills the readout, lights its ideas and locks the cursor on', hov.title === 'LLM Hive' && hov.on === 3 && hov.cursor.includes('is-lock'), JSON.stringify(hov));

await page.mouse.move(700, 120);
await page.hover('[data-thread="graphs"]');
await sleep(500);
const th = await page.evaluate(() => ({ on: document.querySelectorAll('[data-link].is-on').length, off: document.querySelectorAll('[data-star].is-off').length, title: document.querySelector('[data-r-title]').textContent }));
check('chart: hovering an idea lights the projects that share it and dims the rest', th.on === 1 && th.off === 5 && th.title === 'Everything is a graph', JSON.stringify(th));

await page.mouse.move(700, 120);
await sleep(300);
await page.evaluate(() => document.querySelector('[data-id="llm-hive"]').scrollIntoView({ block: 'center', behavior: 'instant' }));
await sleep(500);
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('[data-id="llm-hive"]')]);
check('chart: clicking a star opens that project page', page.url().endsWith('/work/llm-hive'), page.url());

/* ---------- Project pages and their figures ---------- */
for (const slug of ['llm-hive', 'saas-financial-simulator', 'orbit', 'ev-route-optimizer']) {
  await go(`/work/${slug}/`, 2600);
  const info = await page.evaluate(() => ({
    h1: document.querySelector('h1').textContent,
    notes: document.querySelectorAll('.prose .sidenote').length,
    h2: document.querySelectorAll('.prose h2').length,
    brief: document.querySelectorAll('.brief > div').length,
    next: !!document.querySelector('.mission-nav .next'),
  }));
  check(`/work/${slug}: title, mission brief, sections, margin notes, next link`, info.h1.length > 2 && info.brief === 3 && info.h2 >= 3 && info.notes >= 1 && info.next, JSON.stringify(info));

  await page.evaluate(() => document.querySelector('.plate.live').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sleep(1500);
  const a = await hash('.plate.live canvas');
  await sleep(1300);
  const b = await hash('.plate.live canvas');
  check(`/work/${slug}: the figure is drawn and animating`, a.n > 250 && a.h !== b.h, `${a.n} px, ${a.h} -> ${b.h}`);

  const box = await (await page.$('.plate.live')).boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 4 });
  await page.mouse.click(box.x + box.width * 0.22, box.y + box.height * 0.35);
  await sleep(600);
  const c = await hash('.plate.live canvas');
  check(`/work/${slug}: tapping the figure keeps it alive`, c.n > 150, `${c.n} px`);
}

/* ---------- Hive: dropping a worker really changes the picture ---------- */
await go('/work/llm-hive/', 2600);
await page.evaluate(() => document.querySelector('.plate.live').scrollIntoView({ block: 'center', behavior: 'instant' }));
await sleep(1200);
const hb = await (await page.$('.plate.live')).boundingBox();
// Workers sit on an ellipse around the centre: the one at the far right is at about 0.5 + 0.36 of the width.
const readCanvas = () => page.$eval('.plate.live canvas', (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let red = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 120 && d[i + 2] < 90 && d[i + 3] > 0) red++; return red; });
const redBefore = await readCanvas();
for (const fx of [0.5 + 0.34, 0.5 - 0.34, 0.5 + 0.17, 0.5 - 0.17]) {
  for (const fy of [0.2, 0.5, 0.78]) await page.mouse.click(hb.x + hb.width * fx, hb.y + hb.height * fy);
}
await sleep(900);
const redAfter = await readCanvas();
check('hive: dropping workers marks them with an ember cross', redAfter > redBefore, `${redBefore} -> ${redAfter}`);

/* ---------- Research ---------- */
await go('/research/', 2600);
const rs = await page.evaluate(() => ({ h: document.querySelector('.study-title').textContent, methods: document.querySelectorAll('#methods .rows li').length, pipe: document.querySelectorAll('.pipe li').length }));
check('research: study title, four methods, four pipeline steps', rs.h === 'Change Impact Analysis' && rs.methods === 4 && rs.pipe === 4, JSON.stringify(rs));
await page.evaluate(() => document.querySelector('.plate.live').scrollIntoView({ block: 'center', behavior: 'instant' }));
await sleep(1500);
const rb = await (await page.$('.plate.live')).boundingBox();
const r1 = await hash('.plate.live canvas');
await page.mouse.click(rb.x + rb.width * 0.2, rb.y + rb.height * 0.5);
await sleep(500);
const r2 = await hash('.plate.live canvas');
check('research: the figure is drawn, and clicking moves the "now" wall', r1.n > 300 && r1.h !== r2.h, `${r1.n} px, ${r1.h} -> ${r2.h}`);

/* ---------- Trajectory ---------- */
await go('/trajectory/', 2500);
await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight - innerHeight - 1100, behavior: 'instant' }));
await sleep(1200);
await page.evaluate(() => document.querySelectorAll('[data-stage]')[5].scrollIntoView({ block: 'center', behavior: 'instant' }));
await sleep(2500);
const tj = await page.evaluate(() => ({
  lit: document.querySelectorAll('.s-dot.is-lit').length,
  total: document.querySelectorAll('.s-dot').length,
  title: document.querySelector('[data-tele-title]').textContent,
  n: document.querySelector('[data-tele-n]').textContent,
  fill: parseFloat(getComputedStyle(document.querySelector('[data-flight-fill]')).getPropertyValue('--p')),
  record: document.querySelectorAll('.rec-col li').length,
}));
check('trajectory: all six stages lit, telemetry says "Currently", the line is filled, the record is listed', tj.lit === 6 && tj.total === 6 && tj.title === 'Currently' && tj.n === '06' && tj.fill > 0.8 && tj.record >= 11, JSON.stringify(tj));

/* ---------- Lab ---------- */
await go('/lab/', 2500);
await page.evaluate(() => document.querySelector('[data-now]').scrollIntoView({ block: 'center', behavior: 'instant' }));
await sleep(5500);
const lab = await page.evaluate(() => ({
  pieces: document.querySelectorAll('.board .piece').length,
  spines: document.querySelectorAll('.spine').length,
  links: document.querySelectorAll('.spine-link').length,
  miles: document.querySelectorAll('.miles li').length,
  term: document.querySelector('[data-now-text]').textContent.length,
  toy: (() => { const c = document.querySelector('[data-toy]'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; })(),
}));
check('lab: chess board, shelf with one real spine and four empty slots, three milestones, now terminal, gravity toy', lab.pieces === 32 && lab.spines === 5 && lab.links === 1 && lab.miles === 3 && lab.term > 5 && lab.toy > 25, JSON.stringify(lab));

/* ---------- The blog post ---------- */
await go('/writing/introduction-to-mechanistic-interpretability/', 2500);
const post = await page.evaluate(() => {
  const text = document.querySelector('.prose').textContent;
  return {
    title: document.querySelector('h1').textContent,
    h2: document.querySelectorAll('.prose h2').length,
    ticks: document.querySelectorAll('[data-rail-link]').length,
    katex: document.querySelectorAll('.prose .katex').length,
    sample: !!document.querySelector('.sample'),
    dropped: (text.match(/\b(thats|dont|cant|youve|isnt|doesnt|wouldnt|theres|heres|arent)\b/gi) ?? []).length,
    date: document.querySelector('.byline').textContent.includes('17 September 2026'),
  };
});
check('post: title, 14 sections, 14 rail ticks, equations, dated 17 September 2026, not a sample', post.title === 'Introduction To Mechanistic Interpretability' && post.h2 === 14 && post.ticks === 14 && post.katex >= 6 && !post.sample && post.date, JSON.stringify(post));
check('post: apostrophes restored (no "thats", "dont", "cant", ...)', post.dropped === 0, String(post.dropped));

await page.evaluate(() => document.getElementById('the-gettier-problem').scrollIntoView({ block: 'start', behavior: 'instant' }));
await sleep(900);
const railNow = await page.$eval('[data-rail-link].is-active', (e) => e.textContent).catch(() => 'none');
check('post: the reading rail follows the section you are in', /Gettier/.test(railNow), railNow);

/* ---------- Phone menu ---------- */
const ph = await browser.newPage();
watch(ph);
await ph.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
await ph.goto(BASE + '/research/', { waitUntil: 'load' });
await sleep(1500);
await ph.click('[data-menu-toggle]');
await sleep(900);
const menu = await ph.$$eval('[data-menu] a', (as) => as.map((a) => a.textContent.trim()));
check('phone menu lists all six pages and marks the current one', menu.join() === 'About,Trajectory,Work,Research,Writing,Lab' && (await ph.$$eval('[data-menu] a[aria-current]', (a) => a.length)) === 1, menu.join());

await browser.close();
