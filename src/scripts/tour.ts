import gsap from 'gsap';
import { profile } from '../data/profile';
import { reduced, scrollTo } from './lenis';

const SPOT_PAD = 18;
const pad = (n: number) => String(n).padStart(2, '0');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Recruiter mode: an opt-in guided tour. It scrolls to each curated highlight
 * (see `profile.tour`), dims everything else, and explains why it matters.
 */
export function initTour() {
  const root = document.querySelector<HTMLElement>('[data-rm]');
  if (!root) return;

  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const spot = q('[data-rm-spot]');
  const card = q('[data-rm-card]');
  const kicker = q('[data-rm-kicker]');
  const title = q('[data-rm-title]');
  const text = q('[data-rm-text]');
  const end = q('[data-rm-end]');
  const progress = q('[data-rm-progress]');
  const pauseBtn = q<HTMLButtonElement>('[data-rm-pause]');

  const steps = profile.tour;
  const base = root.dataset.base ?? '';
  const onHome = !!document.querySelector('[data-hero]');

  let active = false;
  let playing = true;
  let index = -1;
  let moving = false;
  let timer: gsap.core.Tween | null = null;
  let token = 0; // invalidates stale async work when the step changes quickly

  const rectOf = (el: HTMLElement) => el.getBoundingClientRect();

  const place = (el: HTMLElement, animate: boolean) => {
    const r = rectOf(el);
    const props = {
      x: r.left - SPOT_PAD,
      y: r.top - SPOT_PAD,
      width: r.width + SPOT_PAD * 2,
      height: r.height + SPOT_PAD * 2,
    };
    if (animate && !reduced) gsap.to(spot, { ...props, duration: 0.9, ease: 'power3.inOut', overwrite: true });
    else gsap.set(spot, props);
  };

  const target = () => (index >= 0 ? document.querySelector<HTMLElement>(steps[index].target) : null);

  async function go(n: number) {
    if (n < 0 || n >= steps.length) return;
    const mine = ++token;
    const first = index === -1;
    index = n;
    timer?.kill();
    moving = true;

    const step = steps[n];
    const el = document.querySelector<HTMLElement>(step.target);
    root.dataset.veil = step.dark ? 'dark' : 'light';
    kicker.textContent = `${pad(n + 1)} / ${pad(steps.length)}`;
    title.textContent = step.title;
    text.textContent = step.text;
    end.hidden = n !== steps.length - 1;
    gsap.set(progress, { scaleX: 0 });
    if (!reduced) gsap.fromTo([kicker, title, text], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.06, ease: 'power2.out' });

    if (!el) {
      moving = false;
      return;
    }

    if (step.dark) {
      await scrollTo(document.documentElement.scrollHeight - window.innerHeight, { duration: 2.2 });
    } else {
      await scrollTo(el, { offset: -Math.round(window.innerHeight * 0.16), duration: 1.7 });
    }
    // Let scroll-triggered reveals and the finale's scrubbed animation settle before measuring.
    await sleep(reduced ? 50 : step.dark ? 1500 : 1250);
    if (mine !== token || !active) return;

    moving = false;
    if (first) {
      place(el, false);
      if (!reduced) gsap.fromTo(spot, { opacity: 0 }, { opacity: 1, duration: 0.6 });
    } else {
      place(el, true);
    }

    if (step.seconds > 0 && playing) run(step.seconds);
  }

  function run(seconds: number) {
    timer?.kill();
    timer = gsap.to(progress, {
      scaleX: 1,
      duration: seconds,
      ease: 'none',
      onComplete: () => go(index + 1),
    });
  }

  function start() {
    if (active) return;
    active = true;
    playing = true;
    index = -1;
    pauseBtn.textContent = 'Pause';
    root.hidden = false;
    if (!reduced) gsap.fromTo(card, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' });
    card.focus({ preventScroll: true });
    go(0);
  }

  function stop() {
    if (!active) return;
    active = false;
    token++;
    timer?.kill();
    const done = () => {
      root.hidden = true;
      gsap.set([card, spot], { clearProps: 'opacity,transform' });
    };
    if (reduced) done();
    else gsap.to([card, spot], { opacity: 0, duration: 0.4, onComplete: done });
  }

  function togglePause() {
    playing = !playing;
    pauseBtn.textContent = playing ? 'Pause' : 'Play';
    pauseBtn.setAttribute('aria-label', playing ? 'Pause tour' : 'Play tour');
    if (!timer) {
      if (playing && steps[index]?.seconds) run(steps[index].seconds);
      return;
    }
    if (playing) timer.resume();
    else timer.pause();
  }

  // ---- Wiring ----
  document.querySelectorAll('[data-tour-start]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (onHome) start();
      else window.location.href = `${base}/?tour=1`;
    }),
  );

  q('[data-rm-exit]').addEventListener('click', stop);
  q('[data-rm-explore]').addEventListener('click', stop);
  q('[data-rm-next]').addEventListener('click', () => go(index + 1));
  q('[data-rm-prev]').addEventListener('click', () => go(index - 1));
  pauseBtn.addEventListener('click', togglePause);

  window.addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'Escape') stop();
    else if (e.key === 'ArrowRight') go(index + 1);
    else if (e.key === 'ArrowLeft') go(index - 1);
    else if (e.key === ' ' && document.activeElement === card) {
      e.preventDefault();
      togglePause();
    }
  });

  // If the visitor scrolls by hand mid-tour, pause and keep the spotlight on its target.
  const keepAligned = () => {
    if (!active || moving) return;
    const el = target();
    if (el) place(el, false);
  };
  window.addEventListener('scroll', keepAligned, { passive: true });
  window.addEventListener('resize', keepAligned);
  const manual = () => {
    if (active && !moving && playing) togglePause();
  };
  window.addEventListener('wheel', manual, { passive: true });
  window.addEventListener('touchmove', manual, { passive: true });

  // Arriving from another page with ?tour=1
  if (onHome && new URLSearchParams(window.location.search).has('tour')) {
    window.history.replaceState(null, '', window.location.pathname);
    window.setTimeout(start, 1200);
  }
}
