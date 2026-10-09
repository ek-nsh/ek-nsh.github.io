import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** True when the visitor asked their OS for less motion. */
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let instance: Lenis | null = null;

/** Smooth scrolling, wired into GSAP's ticker so ScrollTrigger stays in sync. */
export function initLenis() {
  if (reduced) return null;
  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  instance = lenis;
  return lenis;
}

export const getLenis = () => instance;

interface ScrollOptions {
  /** Pixels added to the target position (negative leaves space above it). */
  offset?: number;
  duration?: number;
}

/** Scroll to an element or an absolute Y. Resolves when the scroll has finished. */
export function scrollTo(target: HTMLElement | number, { offset = 0, duration = 1.6 }: ScrollOptions = {}) {
  return new Promise<void>((resolve) => {
    const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const dest = Math.min(Math.max(y + offset, 0), max);

    if (!instance) {
      window.scrollTo({ top: dest, behavior: 'auto' });
      resolve();
      return;
    }

    if (Math.abs(dest - window.scrollY) < 2) {
      resolve();
      return;
    }

    // Safety net: resolve even if Lenis never fires onComplete.
    const bail = window.setTimeout(resolve, duration * 1000 + 400);
    instance.scrollTo(dest, {
      duration,
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
      onComplete: () => {
        window.clearTimeout(bail);
        resolve();
      },
    });
  });
}
