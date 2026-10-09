import { reduced } from './lenis';

const DWELL_SECONDS = 6;

/**
 * Project highlight reel. Hover (or tap, or arrow-key) a title and its card takes the
 * stage. Left alone, it advances by itself: the hairline under the active title fills,
 * and its `animationend` moves the reel on, so there are no timers to drift.
 */
export function initReel() {
  const reel = document.querySelector<HTMLElement>('[data-reel]');
  if (!reel) return;

  const items = Array.from(reel.querySelectorAll<HTMLButtonElement>('[data-reel-item]'));
  const cards = Array.from(reel.querySelectorAll<HTMLElement>('[data-reel-card]'));
  const canHover = window.matchMedia('(hover: hover)').matches;

  let current = 0;
  let inView = false;
  let hovering = false;
  let focused = false;

  const cycles = !reduced && canHover;
  reel.style.setProperty('--t', `${DWELL_SECONDS}s`);
  if (!cycles) reel.classList.add('no-cycle');

  const show = (i: number) => {
    current = (i + items.length) % items.length;
    items.forEach((it, n) => it.setAttribute('aria-current', String(n === current)));
    cards.forEach((c, n) => (n === current ? c.setAttribute('data-active', '') : c.removeAttribute('data-active')));
  };

  const syncPause = () => reel.classList.toggle('is-paused', hovering || focused || !inView);

  items.forEach((it, i) => {
    it.addEventListener('pointerenter', () => canHover && show(i));
    it.addEventListener('click', () => show(i));
    it.addEventListener('focus', () => show(i));
    it.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const next = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next].focus();
    });
    // The fill finishing is the cue to advance.
    it.querySelector('.bar')?.addEventListener('animationend', () => cycles && show(current + 1));
  });

  reel.addEventListener('pointerenter', () => {
    hovering = true;
    syncPause();
  });
  reel.addEventListener('pointerleave', () => {
    hovering = false;
    syncPause();
  });
  reel.addEventListener('focusin', () => {
    focused = true;
    syncPause();
  });
  reel.addEventListener('focusout', () => {
    focused = false;
    syncPause();
  });

  // Only run while it is on screen, and restart the fill when it comes back.
  new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      syncPause();
    },
    { threshold: 0.35 },
  ).observe(reel);
  syncPause();
}
