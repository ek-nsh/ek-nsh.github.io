import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reduced } from './lenis';
import { colorAt } from './colors';

/**
 * The flight path on /trajectory: a line that fills as you scroll, dots that light in the colour of
 * the path, and a telemetry card that tracks which stage is at the middle of the screen.
 */
export function initTimeline() {
  const root = document.querySelector<HTMLElement>('[data-flight]');
  if (!root) return;

  const stages = Array.from(root.querySelectorAll<HTMLElement>('[data-stage]'));
  const wrap = root.querySelector<HTMLElement>('.stages-wrap')!;
  const fill = root.querySelector<HTMLElement>('[data-flight-fill]')!;
  const sprites = Array.from(root.querySelectorAll<HTMLElement>('[data-tele-sprite]'));
  const n = root.querySelector<HTMLElement>('[data-tele-n]');
  const when = root.querySelector<HTMLElement>('[data-tele-when]');
  const title = root.querySelector<HTMLElement>('[data-tele-title]');

  const light = (i: number) => {
    const dot = stages[i].querySelector<HTMLElement>('[data-dot]')!;
    dot.style.setProperty('--c', colorAt(stages.length > 1 ? i / (stages.length - 1) : 1));
    dot.classList.add('is-lit');
  };

  const activate = (i: number) => {
    sprites.forEach((s, k) => s.classList.toggle('is-on', k === i));
    if (n) n.textContent = String(i + 1).padStart(2, '0');
    if (when) when.textContent = stages[i].dataset.when ?? '';
    if (title) title.textContent = stages[i].dataset.title ?? '';
  };
  activate(0);

  if (reduced) {
    fill.style.setProperty('--p', '1');
    stages.forEach((_, i) => light(i));
    return;
  }

  ScrollTrigger.create({
    trigger: wrap,
    start: 'top 60%',
    end: 'bottom 60%',
    onUpdate: (self) => fill.style.setProperty('--p', String(self.progress)),
    onRefresh: (self) => fill.style.setProperty('--p', String(self.progress)),
  });

  // A stage lights when it reaches the middle band of the screen, and stays lit.
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const i = stages.indexOf(e.target as HTMLElement);
        activate(i);
        for (let k = 0; k <= i; k++) light(k);
      });
    },
    { rootMargin: '-42% 0px -48% 0px' },
  );
  stages.forEach((s) => io.observe(s));
}
