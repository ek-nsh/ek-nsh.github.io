// Shared settings for the browser checks in this folder.
//
// These scripts drive a real Chrome with puppeteer-core. They are not wired into `npm test`
// (puppeteer-core is not a project dependency); see docs/verification.md for setup.
//
//   BASE         site to test            default http://localhost:4321  (npm run dev)
//   CHROME_PATH  Chrome/Chromium binary  default the usual Windows install path
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
/** Screenshots land here (git-ignored). */
export const OUT = path.join(HERE, 'shots');
fs.mkdirSync(OUT, { recursive: true });

export const BASE = process.env.BASE ?? 'http://localhost:4321';
export const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const launch = (puppeteer, args = []) =>
  puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', ...args] });

/** Collect PASS/FAIL lines and print them even if a later step throws. */
export function reporter() {
  const results = [];
  const errors = [];
  let printed = false;
  const print = () => {
    if (printed) return;
    printed = true;
    console.log(results.join('\n'));
    console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].join('\n') : 'no console errors');
  };
  process.on('exit', print);
  return {
    check: (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name} ${detail}`),
    /** Attach to a page to collect uncaught errors and console errors (404 noise ignored). */
    watch: (page) => {
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && !m.text().includes('404') && errors.push(m.text()));
    },
    failed: () => results.some((r) => r.startsWith('FAIL')) || errors.length > 0,
  };
}
