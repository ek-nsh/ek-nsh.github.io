import gsap from 'gsap';
import { reduced } from './lenis';
import { supernova } from './nova';
import { discover } from './discoveries';

/** Small things that are easy to miss. */
export function initNuances() {
  logoProgress();
  tabTitle();
  konami();
  magnetic();
  greeting();
  // The reward for finding all six hidden things.
  window.addEventListener('discoveries:complete', () => supernova());
}

/** The ring around the logo dot fills as you scroll. */
function logoProgress() {
  const ring = document.querySelector<SVGCircleElement>('[data-progress]');
  if (!ring) return;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    ring.style.strokeDashoffset = String(1 - p);
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/** When you switch tabs, the title keeps the star burning, and coming back is a discovery. */
function tabTitle() {
  const original = document.title;
  let left = 0;
  document.addEventListener('visibilitychange', () => {
    document.title = document.hidden ? 'Still burning ✦ come back' : original;
    if (document.hidden) left = Date.now();
    else if (left && Date.now() - left > 2500) discover('peek');
  });
}

/** ↑ ↑ ↓ ↓ ← → ← → B A */
function konami() {
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let at = 0;
  window.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    at = key === code[at] ? at + 1 : key === code[0] ? 1 : 0;
    if (at === code.length) {
      at = 0;
      supernova();
    }
  });
}

/** Buttons marked `data-magnetic` lean toward the pointer when it is near. */
function magnetic() {
  if (reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]')).map((el) => ({
    el,
    x: gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' }),
    y: gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' }),
  }));

  window.addEventListener(
    'pointermove',
    (e) => {
      items.forEach(({ el, x, y }) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const near = Math.hypot(dx, dy) < Math.max(r.width, r.height) * 0.9 + 28;
        x(near ? dx * 0.28 : 0);
        y(near ? dy * 0.28 : 0);
      });
    },
    { passive: true },
  );
}

/** A hello for anyone who opens the console. */
function greeting() {
  console.log(
    '%c e·k %c Hello, curious one. There is a star on the home page. Poke it three times.',
    'background:#1b1a18;color:#fbfaf7;border-radius:3px;padding:2px 6px;font-weight:600',
    'color:#e8532f',
  );
}
