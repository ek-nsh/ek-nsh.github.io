import { mulberry32 } from './rng';
import { pixelSurface, pickShape, stamp, loop, type PixelSurface } from './pixels';

type Offsets = [number, number][];

const RING_LIFE = 11; // seconds

export interface EjectaOptions {
  /** Square canvas size in CSS px. */
  size: number;
  px?: number;
  colors: string[];
  /** Particles per second. */
  rate?: number;
  /** Pointer position in client px, or null. Particles shy away from it. */
  pointer?: () => [number, number] | null;
  active: () => boolean;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  curl: number;
  age: number;
  life: number;
  shape: Offsets;
  color: string;
}

/**
 * A white hole: it only ever gives. Pixel shapes spiral outward from the core, slow down,
 * blink and vanish. Hover near them and they drift away from your pointer.
 */
export class Ejecta {
  private surf: PixelSurface;
  private rand = mulberry32(2026);
  private sparks: Spark[] = [];
  /** Slow shock rings drawn as dotted pixel circles, not smooth ones. */
  private rings: { age: number; color: string }[] = [];
  private ringClock = 5.4;
  private ringCount = 0;
  private carry = 0;
  private emitting = false;
  private start: () => void;

  constructor(private canvas: HTMLCanvasElement, private o: EjectaOptions) {
    this.surf = pixelSurface(canvas, o.size, o.size, o.px ?? 3);
    this.start = loop((dt) => this.frame(dt), () => !this.dead && o.active());
  }

  private dead = false;

  /** Stop for good (the canvas is about to be reused by a new instance). */
  destroy() {
    this.dead = true;
  }

  /** Start giving (or resume after the loop slept). */
  open() {
    if (this.dead) return;
    this.emitting = true;
    this.start();
  }

  /** A sudden gush: used when the star is poked. */
  gush(n = 26) {
    for (let i = 0; i < n; i++) this.emit(1.7);
    this.start();
  }

  /** Draw a settled frame without animating (reduced motion). */
  still() {
    for (let i = 0; i < 46; i++) {
      this.emit(1);
      const s = this.sparks[this.sparks.length - 1];
      const t = this.rand() * s.life * 0.8;
      s.age = t;
      for (let k = 0; k < 20; k++) this.step(s, t / 20);
    }
    this.draw();
  }

  private emit(power = 1) {
    const { w, h } = this.surf;
    const a = this.rand() * Math.PI * 2;
    const speed = (16 + this.rand() * 22) * power;
    this.sparks.push({
      x: w / 2 + Math.cos(a) * 3,
      y: h / 2 + Math.sin(a) * 3,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      curl: (this.rand() < 0.5 ? -1 : 1) * (0.35 + this.rand() * 0.6),
      age: 0,
      life: 5 + this.rand() * 4,
      shape: pickShape(this.rand),
      color: this.o.colors[Math.floor(this.rand() * this.o.colors.length)],
    });
  }

  private step(s: Spark, dt: number) {
    // Spiral outward: rotate the velocity a little each frame while it slows.
    const c = Math.cos(s.curl * dt);
    const n = Math.sin(s.curl * dt);
    const drag = Math.pow(0.78, dt);
    const vx = (s.vx * c - s.vy * n) * drag;
    const vy = (s.vx * n + s.vy * c) * drag;
    s.vx = vx;
    s.vy = vy;
    s.x += vx * dt;
    s.y += vy * dt;
    s.age += dt;
  }

  private frame(dt: number) {
    if (this.emitting) {
      this.carry += dt * (this.o.rate ?? 7);
      while (this.carry >= 1) {
        this.carry -= 1;
        this.emit();
      }
    }

    // A shock ring leaves the core every few seconds, alternating ember and amber.
    if (this.emitting) {
      this.ringClock += dt;
      if (this.ringClock >= 7) {
        this.ringClock = 0;
        // Ash, not ember: the only orange near the core is the core itself.
        this.rings.push({ age: 0, color: this.ringCount++ % 2 ? '#d9d4c8' : '#b9b7b2' });
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      if ((this.rings[i].age += dt) > RING_LIFE) this.rings.splice(i, 1);
    }

    // Pointer in art pixels.
    const pointer = this.o.pointer?.();
    let px = -999;
    let py = -999;
    if (pointer) {
      const r = this.canvas.getBoundingClientRect();
      px = (pointer[0] - r.left) / this.surf.px;
      py = (pointer[1] - r.top) / this.surf.px;
    }

    const { w, h } = this.surf;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      const dx = s.x - px;
      const dy = s.y - py;
      const d = Math.hypot(dx, dy);
      if (d < 26 && d > 0.01) {
        const f = (1 - d / 26) * 120 * dt;
        s.vx += (dx / d) * f;
        s.vy += (dy / d) * f;
      }
      this.step(s, dt);
      if (s.age >= s.life || s.x < -6 || s.y < -6 || s.x > w + 6 || s.y > h + 6) this.sparks.splice(i, 1);
    }
    this.draw();
  }

  private draw() {
    const { ctx, w, h } = this.surf;
    ctx.clearRect(0, 0, w, h);

    // Rings first, so sparks sit on top. They start well clear of the core and fade in and out.
    for (const ring of this.rings) {
      const t = Math.min(ring.age / RING_LIFE, 1);
      const r = 26 + (w / 2 - 28) * (1 - Math.pow(1 - t, 2));
      ctx.globalAlpha = Math.sin(Math.PI * t) * 0.55;
      ctx.fillStyle = ring.color;
      const n = Math.max(32, Math.round(r * 2.1));
      for (let i = 0; i < n; i += 2) {
        const a = (i / n) * Math.PI * 2;
        ctx.fillRect(Math.round(w / 2 + Math.cos(a) * r), Math.round(h / 2 + Math.sin(a) * r), 1, 1);
      }
    }
    ctx.globalAlpha = 1;

    for (const s of this.sparks) {
      // Blink out at the end of life.
      if (s.age / s.life > 0.72 && Math.floor(s.age * 14) % 2 === 0) continue;
      ctx.fillStyle = s.color;
      stamp(ctx, s.shape, s.x, s.y);
    }
  }
}
