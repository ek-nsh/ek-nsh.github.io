import { reduced } from './lenis';
import { holeState, insideDark } from './hole-state';

const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, summary, label';
/** How far from the black hole its pull starts to bend the cursor, in CSS px. */
const WELL = 320;

/**
 * A telescope reticle that trails the pointer: ring, four ticks and a core. Over links it opens
 * and turns; over `data-cursor-label` things it names them in small mono type; over
 * `data-cursor-lock` things (the black hole) four brackets snap around the target. Near the black hole
 * the reticle is bent toward it by gravity. The native cursor stays visible. Touch devices get none of this.
 */
export function initCursor() {
  const el = document.querySelector<HTMLElement>('[data-cursor]');
  if (!el || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const label = el.querySelector<HTMLElement>('.cursor-label')!;
  let px = window.innerWidth / 2; // real pointer
  let py = window.innerHeight / 2;
  let x = px; // what is drawn
  let y = py;
  let seen = false;
  let lock: HTMLElement | null = null;

  window.addEventListener(
    'pointermove',
    (e) => {
      px = e.clientX;
      py = e.clientY;
      if (!seen) {
        x = px;
        y = py;
        seen = true;
        el.classList.add('is-visible');
      }
    },
    { passive: true },
  );

  document.documentElement.addEventListener('mouseleave', () => el.classList.remove('is-visible'));
  document.documentElement.addEventListener('mouseenter', () => seen && el.classList.add('is-visible'));

  document.addEventListener('pointerover', (e) => {
    const target = e.target as Element | null;
    const labelled = target?.closest<HTMLElement>('[data-cursor-label]');
    lock = target?.closest<HTMLElement>('[data-cursor-lock]') ?? null;
    if (labelled) label.textContent = labelled.dataset.cursorLabel ?? '';
    el.classList.toggle('has-label', !!labelled);
    el.classList.toggle('is-lock', !!lock);
    el.classList.toggle('is-link', !labelled && !lock && !!target?.closest(INTERACTIVE));
    if (lock) {
      const r = lock.getBoundingClientRect();
      el.style.setProperty('--lw', `${r.width + 22}px`);
      el.style.setProperty('--lh', `${r.height + 22}px`);
    }
  });

  // One thin expanding ring per click: a tiny shockwave.
  document.addEventListener('pointerdown', (e) => {
    const ring = document.createElement('div');
    ring.className = 'shock' + (insideDark(e.clientX, e.clientY) ? ' on-dark' : '');
    ring.style.left = `${e.clientX}px`;
    ring.style.top = `${e.clientY}px`;
    ring.addEventListener('animationend', () => ring.remove());
    document.body.appendChild(ring);
  });

  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(now - last, 50);
    last = now;

    // Where the reticle wants to be: the pointer, bent toward the hole, or snapped to a locked target.
    let tx = px;
    let ty = py;
    if (lock && lock.isConnected) {
      const r = lock.getBoundingClientRect();
      tx = r.left + r.width / 2;
      ty = r.top + r.height / 2;
    } else if (holeState.r > holeState.maxR * 0.55) {
      const d = Math.hypot(px - holeState.cx, py - holeState.cy);
      if (d < WELL) {
        const f = Math.pow(1 - d / WELL, 2) * 0.38;
        tx = px + (holeState.cx - px) * f;
        ty = py + (holeState.cy - py) * f;
      }
    }

    // Frame-rate independent easing: about 0.3s to settle.
    const k = reduced ? 1 : 1 - Math.pow(1 - 0.16, dt / 16.667);
    x += (tx - x) * k;
    y += (ty - y) * k;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    el.classList.toggle('on-dark', insideDark(px, py));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
