import gsap from 'gsap';
import { reduced } from './lenis';

/** Hero entrance: the name rises letter by letter from a mask, then the rest fades up. */
function heroIntro() {
  const chars = gsap.utils.toArray<HTMLElement>('.hero-name .ch');
  if (!chars.length) return;

  gsap.set(chars, { yPercent: 115 });
  gsap.set('.hero-name', { visibility: 'visible' });

  const core = document.querySelector('[data-core]');
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  // The star ignites first; its rings start a moment later (see Hero.astro).
  if (core) tl.fromTo(core, { scale: 0 }, { scale: 1, duration: 0.9, ease: 'back.out(2.2)' }, 0.1);
  tl.to(chars, { yPercent: 0, duration: 1.4, stagger: 0.07 }, 0.3).fromTo(
    '[data-hero-fade]',
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 1.1, stagger: 0.14 },
    0.9,
  );
}

/** Fade-and-rise for blocks as they enter the viewport. */
function scrollReveals() {
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
}

/** Large statements slide up word by word. Words are split at build time. */
function wordReveals() {
  gsap.utils.toArray<HTMLElement>('[data-words]').forEach((el) => {
    const words = el.querySelectorAll<HTMLElement>('.w > span');
    gsap.set(words, { yPercent: 110 });
    gsap.set(el, { visibility: 'visible' });
    gsap.to(words, {
      yPercent: 0,
      duration: 1,
      ease: 'power4.out',
      stagger: 0.028,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

export function initReveals() {
  if (reduced) return;
  heroIntro();
  scrollReveals();
  wordReveals();
}
