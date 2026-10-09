// The site's pixel vocabulary: tiny shapes that are not just squares.
// Everything draws to a low-resolution canvas that the browser scales up with
// nearest-neighbour, so each "pixel" is a crisp block (3 CSS px by default).

type Offsets = [number, number][];

const SRC: Record<string, string[]> = {
  dot: ['1'],
  sq: ['11', '11'],
  plus: ['.1.', '111', '.1.'],
  x: ['1.1', '.1.', '1.1'],
  diamond: ['..1..', '.1.1.', '1...1', '.1.1.', '..1..'],
  tri: ['..1..', '.111.', '11111'],
  ring: ['.111.', '1...1', '1...1', '1...1', '.111.'],
  bar: ['111'],
  el: ['1.', '1.', '11'],
};

const toOffsets = (rows: string[]): Offsets => {
  const h = rows.length;
  const w = rows[0].length;
  const out: Offsets = [];
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === '1') out.push([x - Math.floor(w / 2), y - Math.floor(h / 2)]);
    }),
  );
  return out;
};

/** Rotate a bitmap 90° clockwise. */
const rotate = (rows: string[]): string[] => {
  const h = rows.length;
  const w = rows[0].length;
  const out: string[] = [];
  for (let x = 0; x < w; x++) {
    let s = '';
    for (let y = h - 1; y >= 0; y--) s += rows[y][x];
    out.push(s);
  }
  return out;
};

/** Weighted pool: small shapes are common, big ones are rare treats. */
export const SHAPES: Offsets[] = (() => {
  const pool: Offsets[] = [];
  const add = (name: string, rotations: number, weight: number) => {
    let rows = SRC[name];
    for (let r = 0; r < rotations; r++) {
      for (let w = 0; w < weight; w++) pool.push(toOffsets(rows));
      rows = rotate(rows);
    }
  };
  add('dot', 1, 3);
  add('sq', 1, 3);
  add('plus', 1, 2);
  add('x', 1, 1);
  add('diamond', 1, 1);
  add('tri', 4, 1);
  add('ring', 1, 1);
  add('bar', 2, 1);
  add('el', 4, 1);
  return pool;
})();

export const DOT: Offsets = toOffsets(SRC.dot);
export const SQUARE: Offsets = toOffsets(SRC.sq);
export const PLUS: Offsets = toOffsets(SRC.plus);
export const DIAMOND: Offsets = toOffsets(SRC.diamond);

export const pickShape = (rand: () => number): Offsets => SHAPES[Math.floor(rand() * SHAPES.length)];

export function stamp(ctx: CanvasRenderingContext2D, shape: Offsets, x: number, y: number) {
  const ox = Math.round(x);
  const oy = Math.round(y);
  for (const [dx, dy] of shape) ctx.fillRect(ox + dx, oy + dy, 1, 1);
}

/** A filled pixel disc. */
export function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    ctx.fillRect(Math.round(cx) - half, Math.round(cy) + y, half * 2 + 1, 1);
  }
}

/** A one-pixel-thick pixel ring. */
export function circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const steps = Math.max(24, Math.round(r * 7));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
  }
}

export interface PixelSurface {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  px: number;
}

/** Size a canvas to cssW x cssH CSS pixels but draw at 1/px resolution. */
export function pixelSurface(canvas: HTMLCanvasElement, cssW: number, cssH: number, px = 3): PixelSurface {
  const w = Math.max(1, Math.ceil(cssW / px));
  const h = Math.max(1, Math.ceil(cssH / px));
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.style.imageRendering = 'pixelated';
  return { ctx: canvas.getContext('2d')!, w, h, px };
}

/** Run a callback every frame while `active()` is true; stops itself otherwise. Returns a starter. */
export function loop(frame: (dt: number) => void, active: () => boolean) {
  let raf = 0;
  let last = 0;
  const tick = (now: number) => {
    if (!active()) {
      raf = 0;
      return;
    }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    frame(dt);
    raf = requestAnimationFrame(tick);
  };
  return () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };
}

interface BurstOptions {
  count?: number;
  /** Art pixels per second. */
  speed?: number;
  colors?: string[];
  px?: number;
}

/** A shower of pixel shapes from a point, on a throwaway full-screen canvas. */
export function burst(x: number, y: number, { count = 60, speed = 90, colors = ['#e8532f', '#1b1a18', '#f2a03d'], px = 3 }: BurstOptions = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'pixel-overlay';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const { ctx, w, h } = pixelSurface(canvas, window.innerWidth, window.innerHeight, px);

  const ox = x / px;
  const oy = y / px;
  const ps = Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.25 + Math.random() * 0.9);
    return {
      x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      age: 0, life: 0.9 + Math.random() * 1.3,
      shape: pickShape(Math.random), color: colors[Math.floor(Math.random() * colors.length)],
    };
  });

  let alive = true;
  const start = loop(
    (dt) => {
      ctx.clearRect(0, 0, w, h);
      let any = false;
      for (const p of ps) {
        p.age += dt;
        if (p.age >= p.life) continue;
        any = true;
        const drag = Math.pow(0.12, dt); // ease to a stop
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // Blink out at the end, the way pixel sprites do.
        if (p.age / p.life > 0.7 && Math.floor(p.age * 16) % 2 === 0) continue;
        ctx.fillStyle = p.color;
        stamp(ctx, p.shape, p.x, p.y);
      }
      if (!any) {
        alive = false;
        canvas.remove();
      }
    },
    () => alive,
  );
  start();
}
