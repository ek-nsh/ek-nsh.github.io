import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reduced } from './lenis';
import { drawRemnant, drawStars } from './remnant';
import { Accretion } from './hole';
import { holeState } from './hole-state';
import { burst } from './pixels';
import { discover } from './discoveries';

const SYNODIC = 29.530588853; // days
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

/** Moon phase from a known new moon: accurate to about a day, plenty for a footer. */
function moonPhase(date = new Date()) {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86_400_000;
  const phase = (((days % SYNODIC) + SYNODIC) % SYNODIC) / SYNODIC; // 0 = new, 0.5 = full
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;

  const name =
    phase < 0.03 || phase > 0.97 ? 'New moon'
    : phase < 0.22 ? 'Waxing crescent'
    : phase < 0.28 ? 'First quarter'
    : phase < 0.47 ? 'Waxing gibbous'
    : phase < 0.53 ? 'Full moon'
    : phase < 0.72 ? 'Waning gibbous'
    : phase < 0.78 ? 'Last quarter'
    : 'Waning crescent';

  return { phase, illumination, name };
}

/** SVG path for the lit part of the moon (r = 7). */
function moonPath(phase: number) {
  const r = 7;
  const k = Math.cos(2 * Math.PI * phase); // 1 at new, -1 at full
  const waxing = phase < 0.5;
  const outer = waxing ? 1 : 0;
  const inner = k < 0 ? outer : 1 - outer;
  const rx = Math.abs(k) * r;
  return `M0 ${-r} A${r} ${r} 0 0 ${outer} 0 ${r} A${rx} ${r} 0 0 ${inner} 0 ${-r} Z`;
}

/** Offset from UTC, in minutes, for an IANA zone at a given moment. */
function offsetMinutes(zone: string, at: Date) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value;
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name ?? '');
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3] ?? '0', 10));
}

/** "3 h 30 m ahead of you", "same time as you", ... */
function describeOffset(diff: number) {
  if (diff === 0) return 'same time as you';
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const span = [h ? `${h} h` : '', m ? `${m} m` : ''].filter(Boolean).join(' ');
  return `${span} ${diff > 0 ? 'ahead of' : 'behind'} you`;
}

function liveFooter() {
  const mine = document.querySelector<HTMLElement>('[data-mytime]');
  const svg = document.querySelector<SVGElement>('[data-moon]');
  const label = document.querySelector<HTMLElement>('[data-moon-label]');

  // "My time", and how far that is from the visitor's own clock.
  if (mine) {
    const zone = mine.dataset.zone ?? 'UTC';
    const clock = mine.querySelector<HTMLElement>('[data-clock]');
    const offset = mine.querySelector<HTMLElement>('[data-offset]');
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const tick = () => {
      const now = new Date();
      if (clock) clock.textContent = fmt.format(now);
      // getTimezoneOffset() is minutes *behind* UTC, so negate it to compare like with like.
      const visitorEast = -now.getTimezoneOffset();
      if (offset) offset.textContent = `· ${describeOffset(offsetMinutes(zone, now) - visitorEast)}`;
    };
    tick();
    window.setInterval(tick, 1000);
  }

  if (svg && label) {
    const { phase, illumination, name } = moonPhase();
    svg.innerHTML =
      `<circle r="7" fill="none" stroke="currentColor" stroke-opacity="0.35" />` +
      `<path d="${moonPath(phase)}" fill="currentColor" />`;
    label.textContent = `${name} · ${Math.round(illumination * 100)}%`;
  }
}

const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

/** Fraction of the scroll runway before the dark begins to open. */
const IRIS_START = 0.25;

export function initFinale() {
  const finale = document.querySelector<HTMLElement>('[data-finale]');
  const page = document.querySelector<HTMLElement>('[data-page]');
  if (!finale || !page) return;

  liveFooter();

  const stars = finale.querySelector<HTMLCanvasElement>('[data-stars]');
  const remnant = finale.querySelector<HTMLCanvasElement>('[data-remnant]');
  const holeCanvas = finale.querySelector<HTMLCanvasElement>('[data-hole-canvas]');
  const wrap = finale.querySelector<HTMLElement>('[data-remnant-wrap]');
  const edge = document.querySelector<HTMLElement>('[data-edge]');
  const cta = finale.querySelector<HTMLAnchorElement>('[data-hole-cta]');
  const iris = !reduced;

  let hole: Accretion | null = null;
  /** The hole animates only while its dark is visible (or always, for the static fallback). */
  const visible = () => !document.hidden && (iris ? holeState.r > 0 : true);

  /** Work out where the hole sits and how big everything is for this viewport. */
  const layout = () => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const phone = W < 760;
    const cx = iris ? W * (phone ? 0.5 : 0.68) : finale.getBoundingClientRect().left + W * (phone ? 0.5 : 0.68);
    const cy = iris ? H * (phone ? 0.31 : 0.47) : 0;

    if (iris) {
      holeState.cx = cx;
      holeState.cy = cy;
      holeState.maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 28;
      finale.style.setProperty('--cx', `${cx}px`);
      finale.style.setProperty('--cy', `${cy}px`);
    }

    const size = phone ? 420 : 640;
    const horizon = phone ? 18 : 22;
    finale.style.setProperty('--hs', `${size}px`);
    finale.style.setProperty('--d', `${horizon * 6}px`);

    if (holeCanvas) {
      hole?.destroy();
      hole = new Accretion(holeCanvas, { size, horizon, outer: phone ? 68 : 100, count: phone ? 220 : 320, active: visible });
      if (!iris) hole.still();
    }
  };

  const drawBackdrops = () => {
    if (stars) drawStars(stars);
    if (remnant) drawRemnant(remnant);
  };

  layout();
  // Backdrops are expensive-ish, so draw them when the browser is idle.
  const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 1500));
  idle(drawBackdrops, { timeout: 4000 });

  let resizeTimer = 0;
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    // Ignore mobile toolbar show/hide (height-only changes).
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      layout();
      drawBackdrops();
    }, 250);
  });

  // ---- The contact button is the hole ----
  if (cta) {
    cta.addEventListener('pointerenter', () => hole?.hover(true));
    cta.addEventListener('pointerleave', () => hole?.hover(false));
    cta.addEventListener('focus', () => hole?.hover(true));
    cta.addEventListener('blur', () => hole?.hover(false));
    cta.addEventListener('click', (e) => {
      discover('horizon');
      if (reduced || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      // Let the pull play out before the mail client takes over.
      e.preventDefault();
      hole?.collapse(700);
      const r = cta.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, { count: 60, speed: 120, colors: ['#f2a03d', '#e8532f', '#f4f1ec'] });
      window.setTimeout(() => (window.location.href = cta.href), 620);
    });
  }

  // ---- Copy the email, with a little shower of pixels ----
  const copy = finale.querySelector<HTMLElement>('[data-copy]');
  const copyText = finale.querySelector<HTMLElement>('[data-copy-text]');
  if (copy && copyText) {
    const original = copyText.textContent ?? '';
    copy.addEventListener('click', async (e) => {
      try {
        await navigator.clipboard.writeText(copy.dataset.copy ?? original);
        copyText.textContent = 'copied ✓';
      } catch {
        copyText.textContent = 'press Ctrl+C';
      }
      if (!reduced) burst(e.clientX || 0, e.clientY || 0, { count: 44, speed: 100, colors: ['#f2a03d', '#e8532f', '#f4f1ec'] });
      window.setTimeout(() => (copyText.textContent = original), 1800);
    });
  }

  if (!iris) return;

  // ---- The reveal: a disc of dark grows from the hole and swallows the page ----
  const update = (progress: number) => {
    // Nothing happens for the first quarter of the runway, so the dark never opens over content
    // you are still reading; after that it opens from the hole and swallows the page.
    const q = progress <= IRIS_START ? 0 : (progress - IRIS_START) / (1 - IRIS_START);
    const e = easeInOut(q);
    const r = holeState.maxR * e;
    holeState.p = progress;
    holeState.r = q <= 0.001 ? 0 : r;
    finale.style.setProperty('--r', `${holeState.r}px`);
    // A small disc is a plain black circle; the hole, the words and the stars fade in as it opens.
    const f = Math.min(Math.max((holeState.r - 70) / 260, 0), 1);
    finale.style.setProperty('--fade', String(f * f * (3 - 2 * f)));

    if (edge) {
      edge.style.display = holeState.r > 0 && progress < 0.985 ? 'block' : 'none';
      edge.style.left = `${holeState.cx}px`;
      edge.style.top = `${holeState.cy}px`;
      edge.style.width = edge.style.height = `${holeState.r * 2}px`;
      edge.style.margin = `${-holeState.r}px 0 0 ${-holeState.r}px`;
    }
    if (wrap) gsap.set(wrap, { scale: 0.62 + 0.38 * e, opacity: Math.min(1, e * 1.5), rotate: -24 * (1 - e) });
    if (holeState.r > 0) hole?.wake();
    window.dispatchEvent(new Event('holeupdate'));
  };

  ScrollTrigger.create({
    trigger: page,
    start: 'bottom bottom',
    end: 'bottom top',
    onUpdate: (self) => update(self.progress),
    onRefresh: (self) => {
      layout();
      update(self.progress);
    },
  });
}
