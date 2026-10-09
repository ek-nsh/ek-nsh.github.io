import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { threads } from '../data/threads';

const NS = 'http://www.w3.org/2000/svg';

/**
 * The star chart on /work. Dotted lines join projects that share an idea (see data/threads.ts).
 * Hovering a star shows its readout and lights its ideas; hovering (or pinning) an idea lights
 * everything that shares it.
 */
export function initChart() {
  const chart = document.querySelector<HTMLElement>('[data-chart]');
  if (!chart) return;

  const svg = chart.querySelector<SVGSVGElement>('[data-links]')!;
  const stars = Array.from(chart.querySelectorAll<HTMLElement>('[data-star]'));
  const chips = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-thread]'));
  const out = {
    kicker: document.querySelector<HTMLElement>('[data-r-kicker]')!,
    title: document.querySelector<HTMLElement>('[data-r-title]')!,
    text: document.querySelector<HTMLElement>('[data-r-text]')!,
    open: document.querySelector<HTMLElement>('[data-r-open]')!,
  };
  const idle = { kicker: out.kicker.textContent ?? '', title: out.title.textContent ?? '', text: out.text.textContent ?? '' };

  const tags = (el: HTMLElement) => (el.dataset.threads ?? '').split(' ').filter(Boolean);
  let pinned = '';
  let hoverThread = '';
  let focus: HTMLElement | null = null;

  /** The sprite's centre, relative to the chart (the name sits below it, so the star's own centre is off). */
  const centre = (star: HTMLElement): [number, number] => {
    const box = chart.getBoundingClientRect();
    const r = (star.querySelector('.sprite') ?? star).getBoundingClientRect();
    return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2];
  };

  const draw = () => {
    const box = chart.getBoundingClientRect();
    if (box.width === 0) return;
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    svg.innerHTML = '';
    const W = box.width;
    const H = box.height;

    // The ecliptic, because it is a sky.
    const ecl = document.createElementNS(NS, 'path');
    ecl.setAttribute('class', 'ecliptic');
    ecl.setAttribute('d', `M 0 ${H * 0.8} C ${W * 0.3} ${H * 0.98}, ${W * 0.62} ${H * 0.22}, ${W} ${H * 0.3}`);
    svg.appendChild(ecl);
    const label = document.createElementNS(NS, 'text');
    label.setAttribute('class', 'ecl-label');
    label.setAttribute('x', String(W * 0.84));
    label.setAttribute('y', String(H * 0.37));
    label.textContent = 'ECLIPTIC';
    svg.appendChild(label);

    threads.forEach((t) => {
      const pts = stars.filter((s) => tags(s).includes(t.id)).map(centre).sort((a, b) => a[0] - b[0]);
      if (pts.length < 2) return;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('class', 'link');
      path.setAttribute('data-link', t.id);
      path.setAttribute('d', pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' '));
      svg.appendChild(path);
    });
    paint();
  };

  const paint = () => {
    const active = hoverThread || pinned;
    const mine = focus ? tags(focus) : [];
    const any = !!active || !!focus;

    svg.querySelectorAll<SVGPathElement>('[data-link]').forEach((l) => {
      const id = l.getAttribute('data-link')!;
      const on = active ? id === active : mine.includes(id);
      l.classList.toggle('is-on', on);
      l.classList.toggle('is-off', any && !on);
    });
    stars.forEach((s) => {
      const t = tags(s);
      const on = active ? t.includes(active) : focus ? s === focus || t.some((x) => mine.includes(x)) : true;
      s.classList.toggle('is-off', any && !on);
    });
    chips.forEach((c) => {
      const id = c.dataset.thread!;
      c.classList.toggle('is-on', active ? id === active : mine.includes(id));
      c.setAttribute('aria-pressed', String(id === pinned));
    });

    if (focus) {
      out.kicker.textContent = [focus.dataset.sub, focus.dataset.status].filter(Boolean).join(' · ');
      out.title.textContent = focus.dataset.title ?? '';
      out.text.textContent = focus.dataset.text ?? '';
      out.open.hidden = !focus.dataset.href;
    } else if (active) {
      const t = threads.find((x) => x.id === active)!;
      out.kicker.textContent = 'An idea that recurs';
      out.title.textContent = t.label;
      out.text.textContent = `${t.text} Lit up: ${stars.filter((s) => tags(s).includes(active)).map((s) => s.dataset.title).join(', ')}.`;
      out.open.hidden = true;
    } else {
      out.kicker.textContent = idle.kicker;
      out.title.textContent = idle.title;
      out.text.textContent = idle.text;
      out.open.hidden = true;
    }
  };

  stars.forEach((s) => {
    const enter = () => ((focus = s), paint());
    const leave = () => ((focus = null), paint());
    s.addEventListener('pointerenter', enter);
    s.addEventListener('focus', enter);
    s.addEventListener('pointerleave', leave);
    s.addEventListener('blur', leave);
  });

  chips.forEach((c) => {
    const id = c.dataset.thread!;
    c.addEventListener('pointerenter', () => ((hoverThread = id), paint()));
    c.addEventListener('pointerleave', () => ((hoverThread = ''), paint()));
    c.addEventListener('click', () => ((pinned = pinned === id ? '' : id), paint()));
  });

  draw();
  ScrollTrigger.addEventListener('refresh', draw);
  let width = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === width) return;
    width = window.innerWidth;
    draw();
  });
}
