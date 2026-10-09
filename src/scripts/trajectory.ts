import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reduced } from './lenis';
import { colorAt } from './colors';

/**
 * Draws the trajectory as a smooth path through the milestone dots. The path is
 * drawn once as it scrolls into view; each dot lights up in the colour of the
 * path as the line reaches it.
 */
export function initTrajectory() {
  const root = document.querySelector<HTMLElement>('[data-traj]');
  if (!root) return;

  const svg = root.querySelector<SVGSVGElement>('[data-traj-svg]')!;
  const base = root.querySelector<SVGPathElement>('[data-traj-base]')!;
  const path = root.querySelector<SVGPathElement>('[data-traj-path]')!;
  const grad = root.querySelector<SVGLinearGradientElement>('[data-traj-grad]')!;
  const dots = Array.from(root.querySelectorAll<HTMLElement>('[data-traj-dot]'));
  const phone = window.matchMedia('(max-width: 860px)');

  let total = 0;
  let fractions: number[] = [];
  let played = false;
  let drawing = false;

  const light = (dot: HTMLElement, t: number) => {
    dot.style.setProperty('--c', colorAt(t));
    dot.classList.add('is-lit');
  };

  /** Catmull–Rom spline through the points, expressed as cubic Béziers. */
  const smooth = (pts: number[][]) => {
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
    }
    return d;
  };

  const build = () => {
    if (phone.matches) return;
    const box = root.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    grad.setAttribute('x1', '0');
    grad.setAttribute('x2', String(box.width));

    const pts = dots.map((d) => {
      const r = d.getBoundingClientRect();
      return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2];
    });
    const d = smooth(pts);
    base.setAttribute('d', d);
    path.setAttribute('d', d);

    total = path.getTotalLength();
    path.style.strokeDasharray = `${total}`;
    if (!drawing) path.style.strokeDashoffset = played ? '0' : `${total}`;

    // Where along the path each dot sits (0 to 1), found by walking the curve.
    fractions = pts.map((p) => {
      let lo = 0;
      let hi = total;
      for (let i = 0; i < 22; i++) {
        const mid = (lo + hi) / 2;
        if (path.getPointAtLength(mid).x < p[0]) lo = mid;
        else hi = mid;
      }
      return lo / total;
    });
    if (played) dots.forEach((dot, i) => light(dot, fractions[i]));
  };

  if (phone.matches || reduced) {
    // Phones and reduced motion: no drawing, just light the dots as they arrive.
    played = true;
    build();
    dots.forEach((dot, i) => {
      const t = dots.length > 1 ? i / (dots.length - 1) : 1;
      if (reduced) return light(dot, t);
      ScrollTrigger.create({ trigger: dot, start: 'top 85%', once: true, onEnter: () => light(dot, t) });
    });
    return;
  }

  build();
  ScrollTrigger.addEventListener('refresh', build);

  ScrollTrigger.create({
    trigger: root,
    start: 'top 78%',
    once: true,
    onEnter: () => {
      const progress = { v: 0 };
      drawing = true;
      gsap.to(progress, {
        v: 1,
        duration: 2.8,
        ease: 'power2.inOut',
        onUpdate: () => {
          path.style.strokeDashoffset = `${total * (1 - progress.v)}`;
          dots.forEach((dot, i) => {
            if (progress.v >= fractions[i] - 0.002 && !dot.classList.contains('is-lit')) light(dot, fractions[i]);
          });
        },
        onComplete: () => {
          drawing = false;
          played = true;
        },
      });
    },
  });
}
