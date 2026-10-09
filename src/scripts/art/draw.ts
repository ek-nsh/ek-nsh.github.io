// Shared drawing helpers for the project figures. Everything draws on a low-resolution
// canvas that the browser scales up, so one unit here is one big pixel.

import type { PixelSurface } from '../pixels';
import { SPRITES, type SpriteName } from '../../lib/sprites';

export const COL = {
  ink: '#1b1a18',
  mid: '#5e5c57',
  ash: '#b9b7b2',
  line: '#d9d4c8',
  faint: '#e7e4dd',
  ember: '#e8532f',
  amber: '#f2a03d',
  paper: '#fbfaf7',
};

/** What a figure gets to know about the pointer. Positions are in art pixels. */
export interface Io {
  pointer: { x: number; y: number } | null;
  /** Taps since the last frame. A figure drains this list. */
  taps: { x: number; y: number }[];
  /** True for the full-size figure on a project page; false for the ambient plate on the home reel. */
  live: boolean;
}

export type Draw = (t: number, dt: number) => void;
export type Builder = (s: PixelSurface, rand: () => number, io: Io) => Draw;

export function px(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

export function fill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const [X, Y, W, H] = [Math.round(x), Math.round(y), Math.round(w), Math.round(h)];
  ctx.fillRect(X, Y, W, 1);
  ctx.fillRect(X, Y + H - 1, W, 1);
  ctx.fillRect(X, Y, 1, H);
  ctx.fillRect(X + W - 1, Y, 1, H);
}

/** A pixel line. `gap` > 1 makes it dotted (every gap-th pixel). */
export function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, gap = 1, offset = 0) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const n = Math.max(Math.abs(dx), Math.abs(dy));
  if (n === 0) return px(ctx, x0, y0);
  for (let i = Math.max(0, offset % gap); i <= n; i += gap) px(ctx, x0 + (dx * i) / n, y0 + (dy * i) / n);
}

/** A polyline with a total length, so something can travel along it. */
export interface Path {
  pts: [number, number][];
  len: number;
  seg: number[];
}

export function makePath(pts: [number, number][]): Path {
  const seg: number[] = [];
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(d);
    len += d;
  }
  return { pts, len, seg };
}

/** Point at fraction f (0 to 1) along a path. */
export function along(p: Path, f: number): [number, number] {
  let d = Math.min(Math.max(f, 0), 1) * p.len;
  for (let i = 0; i < p.seg.length; i++) {
    if (d <= p.seg[i] || i === p.seg.length - 1) {
      const k = p.seg[i] === 0 ? 0 : Math.min(d / p.seg[i], 1);
      return [p.pts[i][0] + (p.pts[i + 1][0] - p.pts[i][0]) * k, p.pts[i][1] + (p.pts[i + 1][1] - p.pts[i][1]) * k];
    }
    d -= p.seg[i];
  }
  return p.pts[p.pts.length - 1];
}

/** Shortest distance from a point to a path. */
export function distTo(p: Path, x: number, y: number) {
  let best = Infinity;
  for (let i = 1; i < p.pts.length; i++) {
    const [ax, ay] = p.pts[i - 1];
    const [bx, by] = p.pts[i];
    const vx = bx - ax;
    const vy = by - ay;
    const L = vx * vx + vy * vy || 1;
    const k = Math.min(Math.max(((x - ax) * vx + (y - ay) * vy) / L, 0), 1);
    best = Math.min(best, Math.hypot(x - (ax + vx * k), y - (ay + vy * k)));
  }
  return best;
}

/** Draw a named sprite with its top-left corner at (x, y). */
export function sprite(ctx: CanvasRenderingContext2D, name: SpriteName, x: number, y: number) {
  SPRITES[name].forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '1') px(ctx, x + i, y + j);
  });
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
