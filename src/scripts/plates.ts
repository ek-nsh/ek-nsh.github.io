import { reduced } from './lenis';
import { mulberry32, gauss } from './rng';
import { pixelSurface, pickShape, stamp, loop, DOT, PLUS, DIAMOND, SQUARE, type PixelSurface } from './pixels';
import type { Builder, Draw, Io } from './art/draw';
import { hive } from './art/hive';
import { ledger } from './art/ledger';
import { orbit } from './art/orbit';
import { route } from './art/route';
import { cochange } from './art/cochange';

type Kind = 'spiral' | 'constellation' | 'rings' | 'nebula' | 'binary' | 'hive' | 'ledger' | 'orbit' | 'route' | 'cochange';
type Offsets = [number, number][];

const INK = '#1b1a18';
const ASH = '#b9b7b2';
const EMBER = '#e8532f';
const AMBER = '#f2a03d';

interface Plate {
  frame: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Null until the plate is built (first time it is on screen). */
  surf: PixelSurface | null;
  draw: Draw | null;
  io: Io;
  seen: boolean;
  /** Art pixels kept clear at the top and bottom for the viewfinder's corner labels. */
  inset: number;
}

/** The bespoke figures leave this much room above and below for the HTML labels in the frame's corners. */
const INSET = 12;
/** Simulated warm-up: 24 steps of 0.12 s (about three seconds) before the first frame is shown. */
const WARM_STEPS = 24;
const WARM_DT = 0.12;
const FIGURES: Kind[] = ['hive', 'ledger', 'orbit', 'route', 'cochange'];

/**
 * Each builder returns a draw(t, dt) that paints one frame onto the surface. The first five are
 * generic ambient art; the last five are the bespoke, interactive figures in ./art.
 */
const BUILDERS: Record<Kind, Builder> = {
  // Two spiral arms of orbiting pixels: a galaxy.
  spiral(s, rand) {
    const { ctx, w, h } = s;
    const R = h * 0.5;
    const bodies = Array.from({ length: 480 }, (_, i) => {
      const t = Math.pow(rand(), 0.7);
      return { r: 3 + t * R, a: (i % 2) * Math.PI + t * 5.4 + gauss(rand) * 0.16, t, shape: pickShape(rand) };
    });
    return (time) => {
      ctx.clearRect(0, 0, w, h);
      for (const b of bodies) {
        const a = b.a + time * (1.5 / (0.09 * b.r + 1));
        ctx.fillStyle = b.t < 0.22 ? AMBER : b.t < 0.58 ? EMBER : b.t < 0.85 ? INK : ASH;
        stamp(ctx, b.t > 0.6 ? DOT : b.shape, w / 2 + Math.cos(a) * b.r * 1.15, h / 2 + Math.sin(a) * b.r * 0.62);
      }
      ctx.fillStyle = EMBER;
      stamp(ctx, PLUS, w / 2, h / 2);
    };
  },

  // A handful of stars joined by dotted lines.
  constellation(s, rand) {
    const { ctx, w, h } = s;
    const pts: { x: number; y: number; shape: Offsets; hot: boolean; phase: number }[] = [];
    // Place stars at least `gap` apart. On a small plate that may be impossible, so the gap
    // relaxes as attempts run out (a plain while-loop here once hung phones).
    let gap = 20;
    for (let tries = 0; pts.length < 15 && tries < 4000; tries++) {
      if (tries > 0 && tries % 150 === 0) gap *= 0.85;
      const x = 14 + rand() * Math.max(1, w - 28);
      const y = 12 + rand() * Math.max(1, h - 24);
      if (pts.every((p) => Math.hypot(p.x - x, p.y - y) > gap)) pts.push({ x, y, shape: rand() < 0.35 ? PLUS : rand() < 0.5 ? DIAMOND : SQUARE, hot: rand() < 0.22, phase: rand() * 6 });
    }
    const edges = new Set<string>();
    pts.forEach((p, i) => {
      pts
        .map((q, j) => ({ j, d: Math.hypot(p.x - q.x, p.y - q.y) }))
        .filter((o) => o.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
        .forEach((o) => edges.add(i < o.j ? `${i}-${o.j}` : `${o.j}-${i}`));
    });
    return (time) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ASH;
      edges.forEach((e) => {
        const [i, j] = e.split('-').map(Number);
        const a = pts[i];
        const b = pts[j];
        const n = Math.hypot(a.x - b.x, a.y - b.y);
        for (let k = 3; k < n - 3; k += 3) ctx.fillRect(Math.round(a.x + ((b.x - a.x) * k) / n), Math.round(a.y + ((b.y - a.y) * k) / n), 1, 1);
      });
      pts.forEach((p) => {
        if (Math.sin(time * 1.3 + p.phase) > 0.93) return; // twinkle
        ctx.fillStyle = p.hot ? EMBER : INK;
        stamp(ctx, p.shape, p.x, p.y);
      });
    };
  },

  // Concentric orbits with bodies of different sizes.
  rings(s, rand) {
    const { ctx, w, h } = s;
    const orbits = [0.2, 0.34, 0.48].map((f, i) => ({
      r: h * f,
      bodies: Array.from({ length: [3, 5, 7][i] }, () => ({ a: rand() * 6.28, shape: pickShape(rand), hot: rand() < 0.3 })),
    }));
    return (time) => {
      ctx.clearRect(0, 0, w, h);
      orbits.forEach((o, oi) => {
        ctx.fillStyle = ASH;
        for (let a = 0; a < 6.28; a += 0.09) ctx.fillRect(Math.round(w / 2 + Math.cos(a) * o.r * 1.9), Math.round(h / 2 + Math.sin(a) * o.r * 0.9), 1, 1);
        o.bodies.forEach((b) => {
          const a = b.a + time * (0.9 / Math.sqrt(o.r / 8)) * (oi % 2 ? -1 : 1);
          ctx.fillStyle = b.hot ? EMBER : INK;
          stamp(ctx, b.shape, w / 2 + Math.cos(a) * o.r * 1.9, h / 2 + Math.sin(a) * o.r * 0.9);
        });
      });
      ctx.fillStyle = EMBER;
      stamp(ctx, SQUARE, w / 2, h / 2);
    };
  },

  // A dithered cloud drifting sideways.
  nebula(s, rand) {
    const { ctx, w, h } = s;
    const o = [rand() * 9, rand() * 9, rand() * 9];
    const noise = (x: number, y: number, t: number) =>
      (Math.sin(x * 0.055 + o[0] + t * 0.25) + Math.sin(y * 0.11 + o[1] - t * 0.18) + Math.sin((x + y) * 0.04 + o[2] + t * 0.12) + Math.sin(Math.hypot(x - w / 2, y - h / 2) * 0.07 - t * 0.3)) / 4;
    // A well-mixed per-cell hash. (A linear one makes visible stripes.)
    const dither = (x: number, y: number) => {
      const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    return (time) => {
      ctx.clearRect(0, 0, w, h);
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const v = noise(x, y, time) * 0.5 + 0.5;
          // Denser where the cloud is thicker; the hash decides which cells survive.
          if (v < 0.46 || dither(x, y) > (v - 0.46) * 2.2) continue;
          ctx.fillStyle = v > 0.82 ? EMBER : v > 0.7 ? AMBER : v > 0.6 ? INK : ASH;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    };
  },

  // Two bodies circling a shared centre, leaving pixel trails.
  binary(s, rand) {
    const { ctx, w, h } = s;
    const stars = Array.from({ length: 34 }, () => [rand() * w, rand() * h]);
    const ecc = 0.28;
    const at = (time: number, mass: number) => {
      const a = time * 0.9;
      const r = (h * 0.34) / (1 + ecc * Math.cos(a));
      return [w / 2 + Math.cos(a + (mass > 0 ? 0 : Math.PI)) * r * (mass > 0 ? 0.55 : 1.45) * 1.5, h / 2 + Math.sin(a + (mass > 0 ? 0 : Math.PI)) * r * (mass > 0 ? 0.55 : 1.45) * 0.7];
    };
    return (time) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ASH;
      stars.forEach(([x, y]) => ctx.fillRect(Math.round(x), Math.round(y), 1, 1));
      [1, -1].forEach((m, i) => {
        for (let k = 36; k > 0; k -= 2) {
          const [x, y] = at(time - k * 0.045, m);
          ctx.fillStyle = k > 22 ? ASH : i ? AMBER : EMBER;
          ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        }
        const [x, y] = at(time, m);
        ctx.fillStyle = i ? INK : EMBER;
        stamp(ctx, i ? DIAMOND : PLUS, x, y);
      });
    };
  },

  hive,
  ledger,
  orbit,
  route,
  cochange,
};

/**
 * Pixel plates and figures: the ambient plates on the home reel and the interactive figures on the
 * project and research pages. Each canvas lives in a `[data-plate-frame]`; `data-live="true"` turns
 * on pointer and tap interaction. Plates only draw while they are on screen (and, in the reel, active).
 */
export function initPlates() {
  const canvases = Array.from(document.querySelectorAll<HTMLCanvasElement>('[data-plate]'));
  if (!canvases.length) return;

  const plates = new Map<HTMLCanvasElement, Plate>();
  const isActive = (p: Plate) => p.seen && (!p.frame.closest('.stage') || !!p.frame.closest('[data-active]'));

  canvases.forEach((canvas) => {
    plates.set(canvas, {
      frame: canvas.closest<HTMLElement>('[data-plate-frame]')!,
      canvas,
      surf: null,
      draw: null,
      io: { pointer: null, taps: [], live: canvas.dataset.live === 'true' },
      seen: false,
      inset: 0,
    });
  });

  /** Size the canvas, make the figure and run a few simulated seconds so the first frame is a scene in progress. */
  const build = (p: Plate) => {
    const r = p.frame.getBoundingClientRect();
    const surf = pixelSurface(p.canvas, r.width, r.height, 3);
    const kind = (p.canvas.dataset.kind as Kind) ?? 'spiral';
    const rand = mulberry32(Number(p.canvas.dataset.seed) || 7);
    const inset = FIGURES.includes(kind) ? INSET : 0;
    // The figure sees a slightly shorter surface, drawn below the top label band.
    if (inset) surf.ctx.translate(0, inset);
    const view: PixelSurface = inset ? { ...surf, h: surf.h - inset * 2 } : surf;
    const draw = BUILDERS[kind](view, rand, p.io);
    for (let i = 0; i < WARM_STEPS; i++) draw(i * WARM_DT, i === 0 ? 0 : WARM_DT);
    p.surf = surf;
    p.draw = draw;
    p.inset = inset;
  };

  // Building is deferred until a plate is first on screen (and active), so page load stays light.
  // With reduced motion nothing ever animates, so draw every plate once now.
  if (reduced) plates.forEach(build);

  let time = WARM_STEPS * WARM_DT; // continues from the warm-up
  const wake = loop(
    (dt) => {
      time += dt;
      plates.forEach((p) => {
        if (!isActive(p)) return;
        if (!p.draw) build(p);
        p.draw!(time, dt);
      });
    },
    () => !reduced && !document.hidden && [...plates.values()].some(isActive),
  );

  const seen = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const plate = plates.get(e.target.querySelector<HTMLCanvasElement>('[data-plate]')!);
        if (plate) plate.seen = e.isIntersecting;
      });
      wake();
    },
    { threshold: 0.2 },
  );
  document.querySelectorAll('[data-plate-frame]').forEach((f) => seen.observe(f));
  // The reel changes which plate is active without scrolling, so wake on its changes too.
  document.addEventListener('visibilitychange', wake);
  new MutationObserver(wake).observe(document.body, { attributes: true, attributeFilter: ['data-active'], subtree: true });

  let width = window.innerWidth;
  let timer = 0;
  window.addEventListener('resize', () => {
    if (window.innerWidth === width) return;
    width = window.innerWidth;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => plates.forEach((p) => p.draw && build(p)), 300);
  });

  // ---- Crosshair + readout (reel), and pointer / tap input (live figures) ----
  document.querySelectorAll<HTMLElement>('[data-plate-frame]').forEach((frame) => {
    const canvas = frame.querySelector<HTMLCanvasElement>('[data-plate]')!;
    const read = frame.querySelector<HTMLElement>('[data-readout]');
    const art = (e: PointerEvent) => {
      const p = plates.get(canvas);
      const r = canvas.getBoundingClientRect();
      const k = p?.surf?.px ?? 3;
      return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k - (p?.inset ?? 0) };
    };

    frame.addEventListener('pointermove', (e) => {
      const r = frame.getBoundingClientRect();
      const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
      const y = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
      frame.style.setProperty('--mx', `${x * 100}%`);
      frame.style.setProperty('--my', `${y * 100}%`);
      frame.classList.add('is-hover');
      if (read) read.textContent = `x ${x.toFixed(2)} · y ${y.toFixed(2)}`;
      const p = plates.get(canvas);
      if (p?.io.live) p.io.pointer = art(e);
    });
    frame.addEventListener('pointerleave', () => {
      frame.classList.remove('is-hover');
      const p = plates.get(canvas);
      if (p) p.io.pointer = null;
    });
    frame.addEventListener('pointerdown', (e) => {
      const p = plates.get(canvas);
      if (!p?.io.live) return;
      p.io.taps.push(art(e));
      if (reduced) p.draw?.(time, 0.016);
      wake();
    });
  });
}
