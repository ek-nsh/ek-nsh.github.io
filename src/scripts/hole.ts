import { mulberry32 } from './rng';
import { pixelSurface, pickShape, stamp, disc, circle, loop, DOT, type PixelSurface } from './pixels';

type Offsets = [number, number][];

export interface HoleOptions {
  /** Square canvas size in CSS px. */
  size: number;
  px?: number;
  /** Radius of the black disc, in art pixels. */
  horizon: number;
  /** Radius of the outer edge of the accretion disc, in art pixels. */
  outer: number;
  count?: number;
  /** Vertical squash of the orbit plane (0 = edge-on, 1 = face-on). */
  tilt?: number;
  /** Rotation of the disc plane, in radians. */
  roll?: number;
  seed?: number;
  /** Use the paper-friendly palette (for light backgrounds). */
  light?: boolean;
  /** Return false to let the animation loop sleep (off-screen, hidden tab...). */
  active: () => boolean;
}

interface Body {
  r: number;
  th: number;
  shape: Offsets;
  bias: number;
}

const VOID = '#030205';

/** Palettes: the finale is dark; the 404 page is paper, where white-hot would vanish. */
const PALETTES = {
  dark: { hot: '#fff1dc', warm: '#f2a03d', mid: '#e8532f', cool: '#7a6ad0' },
  light: { hot: '#1b1a18', warm: '#f2a03d', mid: '#e8532f', cool: '#b9b7b2' },
};

/**
 * A black hole drawn in pixel shapes: a tilted accretion disc of squares, plus signs,
 * diamonds, triangles and rings, orbiting faster the closer they are, slowly falling in
 * and being replaced from the outer edge. The back of the disc passes behind the hole,
 * the front passes in front of it.
 */
export class Accretion {
  /** 1 = normal; hovering the contact button raises it. */
  speed = 1;
  private targetSpeed = 1;
  private pull = 0;
  private glow = 0;
  private targetGlow = 0;
  private surf: PixelSurface;
  private rand: () => number;
  private bodies: Body[] = [];
  private spin = 0;
  private start: () => void;
  private readonly inner: number;
  private readonly pal: (typeof PALETTES)['dark'];
  private readonly k: number;

  constructor(private canvas: HTMLCanvasElement, private o: HoleOptions) {
    this.surf = pixelSurface(canvas, o.size, o.size, o.px ?? 3);
    this.rand = mulberry32(o.seed ?? 77);
    this.pal = o.light ? PALETTES.light : PALETTES.dark;
    this.inner = o.horizon * 1.38;
    this.k = 1.9 * Math.pow(this.inner, 1.5); // angular speed is k / r^1.5
    const count = o.count ?? 300;
    for (let i = 0; i < count; i++) this.bodies.push(this.spawn(false));
    this.start = loop((dt) => this.frame(dt), () => !this.dead && o.active());
    this.draw();
  }

  private dead = false;

  /** Stop for good (the canvas is about to be redrawn by a new instance). */
  destroy() {
    this.dead = true;
  }

  /** Wake the loop (call whenever the hole becomes visible). */
  wake() {
    this.start();
  }

  hover(on: boolean) {
    this.targetSpeed = on ? 2.6 : 1;
    this.targetGlow = on ? 1 : 0;
  }

  /** Everything rushes in for a moment. */
  collapse(ms = 650) {
    this.pull = 1;
    this.targetGlow = 1;
    window.setTimeout(() => {
      this.pull = 0;
      this.targetGlow = 0;
    }, ms);
  }

  /** Draw once without animating (reduced motion). */
  still() {
    this.draw();
  }

  private spawn(fromEdge: boolean): Body {
    const { outer } = this.o;
    // Log-uniform radius: more bodies near the hole, a thin scatter far out.
    const u = fromEdge ? 0.82 + this.rand() * 0.18 : this.rand();
    return {
      r: this.inner * Math.pow(outer / this.inner, u),
      th: this.rand() * Math.PI * 2,
      shape: pickShape(this.rand),
      bias: (this.rand() - 0.5) * 0.22,
    };
  }

  private frame(dt: number) {
    this.speed += (this.targetSpeed - this.speed) * Math.min(dt * 4, 1);
    this.glow += (this.targetGlow - this.glow) * Math.min(dt * 6, 1);
    this.spin += dt * 0.6 * this.speed;

    const { horizon } = this.o;
    let respawned = 0;
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      b.th += (this.k / Math.pow(b.r, 1.5)) * this.speed * dt;
      b.r -= (0.25 + 36 / b.r + this.pull * 70) * dt * (0.6 + 0.4 * this.speed);
      if (b.r <= horizon + 0.5 && respawned < 6) {
        this.bodies[i] = this.spawn(true);
        respawned++;
      }
    }
    this.draw();
  }

  private colour(b: Body) {
    const { outer } = this.o;
    const t = Math.min(Math.max((b.r - this.inner) / (outer - this.inner) + b.bias, 0), 1);
    const { hot, warm, mid, cool } = this.pal;
    return t < 0.1 ? hot : t < 0.38 ? warm : t < 0.74 ? mid : cool;
  }

  private place(b: Body): [number, number, boolean] {
    const { tilt = 0.34, roll = -0.28 } = this.o;
    const cx = this.surf.w / 2;
    const cy = this.surf.h / 2;
    const ex = b.r * Math.cos(b.th);
    const ey = b.r * Math.sin(b.th) * tilt;
    const cs = Math.cos(roll);
    const sn = Math.sin(roll);
    return [cx + ex * cs - ey * sn, cy + ex * sn + ey * cs, Math.sin(b.th) < 0];
  }

  private draw() {
    const { ctx, w, h } = this.surf;
    const cx = w / 2;
    const cy = h / 2;
    const { horizon } = this.o;
    ctx.clearRect(0, 0, w, h);

    // 1. The far side of the disc, passing behind the hole.
    for (const b of this.bodies) {
      const [x, y, back] = this.place(b);
      if (!back) continue;
      ctx.fillStyle = this.colour(b);
      stamp(ctx, b.shape, x, y);
    }

    // 2. The hole itself, and a thin photon ring that flares when you reach for it.
    ctx.fillStyle = VOID;
    disc(ctx, cx, cy, horizon);
    const { hot, warm, mid } = this.pal;
    ctx.fillStyle = this.glow > 0.5 ? hot : warm;
    circle(ctx, cx, cy, horizon + 1);
    if (this.glow > 0.2) {
      ctx.fillStyle = this.glow > 0.7 ? warm : mid;
      circle(ctx, cx, cy, horizon + 2);
    }

    // 3. Lensed light: a slowly turning ring of dots just outside the horizon.
    const lens = horizon * 1.5;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + this.spin;
      ctx.fillStyle = i % 4 === 0 ? hot : i % 2 === 0 ? warm : mid;
      stamp(ctx, DOT, cx + Math.cos(a) * lens, cy + Math.sin(a) * lens * 0.96);
    }

    // 4. The near side of the disc, passing in front.
    for (const b of this.bodies) {
      const [x, y, back] = this.place(b);
      if (back) continue;
      ctx.fillStyle = this.colour(b);
      stamp(ctx, b.shape, x, y);
    }
  }
}

