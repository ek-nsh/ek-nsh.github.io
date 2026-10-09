import gsap from 'gsap';
import { reduced } from './lenis';
import { burst } from './pixels';
import { discover } from './discoveries';

let busy = false;

/** The easter egg: a dying star finally goes. Rings, a warm flash, a shower of pixel shapes. */
export function supernova(x = window.innerWidth / 2, y = window.innerHeight / 2) {
  if (busy) return;
  busy = true;
  window.setTimeout(() => (busy = false), 3400);

  console.log('%c ✦ supernova ', 'background:#e8532f;color:#fff;border-radius:3px;padding:2px 6px', 'You found it.');
  discover('supernova');

  if (reduced) return;

  const reach = Math.hypot(window.innerWidth, window.innerHeight) * 2.1;

  const flash = document.createElement('div');
  flash.className = 'nova-flash';
  flash.style.setProperty('--x', `${x}px`);
  flash.style.setProperty('--y', `${y}px`);
  document.body.appendChild(flash);
  gsap.fromTo(flash, { opacity: 0.9 }, { opacity: 0, duration: 1.3, ease: 'power2.out', onComplete: () => flash.remove() });

  [0, 1, 2].forEach((i) => {
    const ring = document.createElement('div');
    ring.className = 'nova-ring';
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    if (i === 1) ring.style.borderColor = 'var(--amber)';
    document.body.appendChild(ring);
    gsap.fromTo(
      ring,
      { width: 0, height: 0, opacity: 0.85 },
      { width: reach, height: reach, opacity: 0, duration: 2.6, delay: i * 0.22, ease: 'power2.out', onComplete: () => ring.remove() },
    );
  });

  // Shrapnel: pixel shapes thrown across the whole viewport.
  burst(x, y, { count: 170, speed: 230, colors: ['#e8532f', '#f2a03d', '#1b1a18', '#b9b7b2'] });

  const page = document.querySelector('[data-page]');
  if (page) {
    gsap.to(page, {
      keyframes: [{ x: -4 }, { x: 4 }, { x: -3 }, { x: 2 }, { x: 0 }],
      duration: 0.4,
      ease: 'none',
      clearProps: 'transform',
    });
  }
}
