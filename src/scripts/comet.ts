import gsap from 'gsap';
import { reduced } from './lenis';
import { burst } from './pixels';
import { discover } from './discoveries';

const NS = 'http://www.w3.org/2000/svg';

/** A comet drawn from pixel squares: a plus-shaped head and a fading tail. */
function buildComet() {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '-78 -9 90 18');
  svg.setAttribute('width', '90');
  svg.setAttribute('height', '18');
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');

  const px = (x: number, y: number, fill: string, opacity = 1) => {
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', String(x * 3 - 1.5));
    r.setAttribute('y', String(y * 3 - 1.5));
    r.setAttribute('width', '3');
    r.setAttribute('height', '3');
    r.setAttribute('fill', fill);
    r.setAttribute('opacity', String(opacity));
    svg.appendChild(r);
  };

  // Head: a plus.
  [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([x, y]) => px(x, y, '#e8532f'));
  // Tail: squares that thin out and fade.
  for (let i = 2; i < 26; i += 1) {
    const jitter = i % 3 === 0 ? 1 : i % 3 === 1 ? -1 : 0;
    if (i % 2 === 0 || i < 8) px(-i, jitter * (i > 6 ? 1 : 0), i < 8 ? '#f2a03d' : '#b9b7b2', Math.max(0.1, 1 - i / 26));
  }
  return svg;
}

function fly() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const leftToRight = Math.random() < 0.5;
  const y0 = H * (0.08 + Math.random() * 0.4);
  const drop = H * (0.22 + Math.random() * 0.3);
  const x0 = leftToRight ? -80 : W + 80;
  const x1 = leftToRight ? W + 80 : -80;
  const angle = (Math.atan2(drop, x1 - x0) * 180) / Math.PI + (leftToRight ? 0 : 180);

  const btn = document.createElement('button');
  btn.className = 'comet';
  btn.type = 'button';
  btn.dataset.cursorLabel = 'Catch';
  btn.setAttribute('aria-label', 'A comet is passing. Catch it');
  btn.appendChild(buildComet());
  document.body.appendChild(btn);

  gsap.set(btn, { x: x0, y: y0, rotation: angle });
  const tween = gsap.to(btn, {
    x: x1,
    y: y0 + drop,
    duration: 4.4 + Math.random() * 1.4,
    ease: 'none',
    onComplete: () => btn.remove(),
  });

  btn.addEventListener('click', (e) => {
    tween.kill();
    burst(e.clientX, e.clientY, { count: 70, speed: 110, colors: ['#e8532f', '#f2a03d', '#1b1a18', '#b9b7b2'] });
    btn.remove();
    discover('comet');
  });
}

/** Every so often, when nobody is looking, a comet crosses the sky. */
export function initComet() {
  if (reduced) return;

  const next = (min: number, spread: number) => {
    window.setTimeout(() => {
      const touring = document.querySelector('[data-rm]:not([hidden])');
      if (!document.hidden && !touring && !document.querySelector('.comet')) fly();
      next(45_000, 45_000);
    }, min + Math.random() * spread);
  };
  next(16_000, 12_000);
}
