import gsap from 'gsap';
import { reduced } from './lenis';
import { supernova } from './nova';
import { Ejecta } from './ejecta';

const BASE_WEIGHT = 300;
const PEAK_WEIGHT = 640;
const REACH = 230; // px of influence around the pointer

/**
 * Hero details for pointer devices:
 * - the name is a variable font, so letters near your pointer thicken and ease back;
 * - the star drifts against the pointer (a hint of depth);
 * - poking the star's core three times sets off a supernova.
 */
export function initHero() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;

  const star = hero.querySelector<HTMLElement>('[data-star]');
  const hit = hero.querySelector<HTMLElement>('[data-core-hit]');
  const chars = Array.from(hero.querySelectorAll<HTMLElement>('.hero-name .ch'));
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---- Weight-reactive name ----
  if (fine && !reduced && chars.length) {
    const weight = chars.map(() => BASE_WEIGHT);
    let px = -9999;
    let py = -9999;
    let running = false;

    const tick = () => {
      let moving = false;
      chars.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), (py - (r.top + r.height / 2)) * 0.6);
        const target = BASE_WEIGHT + (PEAK_WEIGHT - BASE_WEIGHT) * Math.exp(-Math.pow(d / REACH, 2));
        weight[i] += (target - weight[i]) * 0.13;
        if (Math.abs(target - weight[i]) > 0.6) moving = true;
        c.style.fontWeight = String(Math.round(weight[i]));
      });
      if (moving) requestAnimationFrame(tick);
      else running = false;
    };
    const wake = () => {
      if (!running) {
        running = true;
        requestAnimationFrame(tick);
      }
    };

    hero.addEventListener('pointermove', (e) => {
      px = e.clientX;
      py = e.clientY;
      wake();
    });
    hero.addEventListener('pointerleave', () => {
      px = py = -9999;
      wake();
    });
  }

  // ---- Star parallax ----
  if (fine && !reduced && star) {
    const moveX = gsap.quickTo(star, 'x', { duration: 1.2, ease: 'power3.out' });
    const moveY = gsap.quickTo(star, 'y', { duration: 1.2, ease: 'power3.out' });
    hero.addEventListener('pointermove', (e) => {
      moveX((e.clientX / window.innerWidth - 0.5) * -26);
      moveY((e.clientY / window.innerHeight - 0.5) * -20);
    });
  }

  // ---- The white hole: pixel shapes spiral out of the core ----
  let pointer: [number, number] | null = null;
  let inView = true;
  let ejecta: Ejecta | null = null;
  const canvas = hero.querySelector<HTMLCanvasElement>('[data-ejecta]');

  const openHole = () => {
    if (!canvas || !star) return;
    ejecta?.destroy();
    const phone = window.innerWidth < 720;
    ejecta = new Ejecta(canvas, {
      size: star.offsetWidth,
      px: phone ? 3 : 3,
      colors: ['#1b1a18', '#1b1a18', '#e8532f', '#b9b7b2', '#f2a03d'],
      rate: phone ? 4 : 7,
      pointer: () => pointer,
      active: () => inView && !document.hidden,
    });
    if (reduced) ejecta.still();
    else window.setTimeout(() => ejecta?.open(), 900);
  };
  openHole();

  hero.addEventListener('pointermove', (e) => (pointer = [e.clientX, e.clientY]));
  hero.addEventListener('pointerleave', () => (pointer = null));
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) ejecta?.open();
  }).observe(hero);

  let width = window.innerWidth;
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    if (window.innerWidth === width) return;
    width = window.innerWidth;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(openHole, 300);
  });

  // ---- Poke the core ----
  if (hit) {
    let pokes = 0;
    let reset = 0;
    hit.addEventListener('click', () => {
      const r = hit.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      pokes += 1;
      window.clearTimeout(reset);
      reset = window.setTimeout(() => (pokes = 0), 1600);

      if (pokes >= 3) {
        pokes = 0;
        ejecta?.gush(70);
        supernova(x, y);
        return;
      }
      ejecta?.gush(pokes === 1 ? 14 : 30);
      // The first two pokes are a warm-up: a slightly bigger ring each time.
      const ring = document.createElement('div');
      ring.className = 'shock';
      ring.style.left = `${x}px`;
      ring.style.top = `${y}px`;
      ring.style.setProperty('--max', `${200 + pokes * 150}px`);
      ring.addEventListener('animationend', () => ring.remove());
      document.body.appendChild(ring);
    });
  }
}
