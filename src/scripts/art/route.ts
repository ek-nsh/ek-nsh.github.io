// EV Route Optimizer: three routes between A and B, each a different trade-off between time,
// energy and risk. Little cars drive them; hover a route to compare.

import { COL, box, fill, line, px, makePath, along, distTo, type Builder, type Path } from './draw';
import { text } from './font';

const ROUTES = [
  { name: 'FAST', color: COL.ink, secs: 7, drain: 0.64, bars: [0.35, 0.85, 0.7], via: [[0.3, 0.55], [0.5, 0.4], [0.7, 0.32]] },
  { name: 'ECO', color: COL.ember, secs: 9.5, drain: 0.34, bars: [0.62, 0.42, 0.5], via: [[0.18, 0.86], [0.45, 0.86], [0.7, 0.7], [0.85, 0.46]] },
  { name: 'SURE', color: COL.amber, secs: 11.5, drain: 0.47, bars: [0.85, 0.6, 0.2], via: [[0.16, 0.38], [0.34, 0.14], [0.62, 0.12], [0.85, 0.14]] },
];
const BAR_LABELS = ['TIME', 'ENERGY', 'RISK'];
const BOLT = ['..1', '.11', '111', '.1.', '1..'];
const CAR = ['.11.', '1111', '.11.'];

export const route: Builder = (s, rand, io) => {
  const { ctx, w, h } = s;
  const showText = w >= 150;
  const band = io.live && showText && h >= 80 ? 30 : 0;
  const mw = w - 16;
  const mh = h - band - 14;
  const at = (fx: number, fy: number): [number, number] => [Math.round(8 + fx * mw), Math.round(7 + fy * mh)];
  const A = at(0.07, 0.62);
  const B = at(0.93, 0.3);

  const paths: Path[] = ROUTES.map((r) => makePath([A, ...r.via.map(([x, y]) => at(x, y)), B]));
  const hill = at(0.5, 0.42);
  const rain = { x0: at(0.6, 0)[0], x1: at(0.8, 0)[0], y0: at(0, 0.18)[1], y1: at(0, 0.44)[1] };
  const bolts = [along(paths[1], 0.62), along(paths[2], 0.45), along(paths[2], 0.8)];

  let clock = 0;
  let lead = 0; // how far the slowest car has got, in seconds
  let hover = -1;
  let locked = -1;
  let cycle = 0;

  const dither = (x: number, y: number) => {
    const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };

  return (time, dt) => {
    clock += dt;
    lead += dt;
    if (lead > ROUTES[2].secs + 2) lead = 0;

    for (const tap of io.taps.splice(0)) {
      if (!io.live) continue;
      const near = paths.map((p) => distTo(p, tap.x, tap.y));
      const best = near.indexOf(Math.min(...near));
      locked = near[best] < 8 ? (locked === best ? -1 : best) : -1;
    }
    hover = -1;
    if (io.live && io.pointer) {
      const near = paths.map((p) => distTo(p, io.pointer!.x, io.pointer!.y));
      const best = near.indexOf(Math.min(...near));
      if (near[best] < 8) hover = best;
    }
    const ambient = Math.floor(clock / 3.6) % 3;
    const focus = locked >= 0 ? locked : hover >= 0 ? hover : io.live && io.pointer ? -1 : ambient;
    cycle = focus;

    ctx.clearRect(0, 0, w, h);

    // elevation: contour rings and a dithered slope
    ctx.fillStyle = COL.faint;
    [26, 17, 9].forEach((r) => {
      for (let a = 0; a < Math.PI * 2; a += 0.06) px(ctx, hill[0] + Math.cos(a) * r * 1.4, hill[1] + Math.sin(a) * r * 0.62);
    });
    ctx.fillStyle = COL.line;
    for (let y = -14; y <= 14; y++) {
      for (let x = -30; x <= 30; x++) {
        const d = Math.hypot(x / 30, y / 14);
        if (d < 1 && dither(x + 99, y + 7) > 0.78 + d * 0.2) px(ctx, hill[0] + x, hill[1] + y);
      }
    }
    if (showText) {
      ctx.fillStyle = COL.ash;
      text(ctx, 'HILL', hill[0] - 7, hill[1] - 3);
    }

    // rain: little diagonals falling through a patch
    ctx.fillStyle = COL.ash;
    for (let i = 0; i < 18; i++) {
      const x = rain.x0 + ((i * 53) % (rain.x1 - rain.x0));
      const y = rain.y0 + ((i * 37 + clock * 22) % (rain.y1 - rain.y0));
      px(ctx, x, y);
      px(ctx, x - 1, y + 1);
    }
    if (showText) text(ctx, 'RAIN', rain.x0, rain.y0 - 7);

    // chargers
    ctx.fillStyle = COL.amber;
    bolts.forEach(([x, y]) => BOLT.forEach((row, j) => [...row].forEach((c, i) => c === '1' && px(ctx, x - 1 + i, y - 8 + j))));

    // routes
    ROUTES.forEach((r, i) => {
      const on = i === focus;
      ctx.fillStyle = on ? r.color : focus === -1 ? r.color : COL.line;
      for (let k = 1; k < paths[i].pts.length; k++) {
        const [x0, y0] = paths[i].pts[k - 1];
        const [x1, y1] = paths[i].pts[k];
        line(ctx, x0, y0, x1, y1, on ? 1 : 3);
        if (on) line(ctx, x0, y0 + 1, x1, y1 + 1, 3);
      }
    });

    // A and B
    ctx.fillStyle = COL.ink;
    fill(ctx, A[0] - 2, A[1] - 2, 5, 5);
    fill(ctx, B[0] - 2, B[1] - 2, 5, 5);
    ctx.fillStyle = COL.paper;
    fill(ctx, A[0] - 1, A[1] - 1, 3, 3);
    fill(ctx, B[0] - 1, B[1] - 1, 3, 3);
    ctx.fillStyle = COL.ink;
    text(ctx, 'A', A[0] - 1, A[1] + 4);
    text(ctx, 'B', B[0] - 1, B[1] + 4);

    // cars, with a battery icon above each
    ROUTES.forEach((r, i) => {
      const p = Math.min(lead / r.secs, 1);
      const [x, y] = along(paths[i], p);
      ctx.fillStyle = r.color;
      CAR.forEach((row, j) => [...row].forEach((c, k) => c === '1' && px(ctx, x - 2 + k, y - 1 + j)));
      const level = 1 - r.drain * p;
      ctx.fillStyle = COL.ink;
      box(ctx, x - 3, y - 6, 7, 3);
      ctx.fillStyle = level < 0.4 ? COL.ember : COL.mid;
      fill(ctx, x - 2, y - 5, Math.max(1, Math.round(5 * level)), 1);
    });

    // trade-off bars
    if (band) {
      const colW = Math.floor(mw / 3);
      ROUTES.forEach((r, i) => {
        const x = 8 + i * colW;
        const y = h - band + 2;
        const on = i === focus;
        ctx.fillStyle = on ? r.color : COL.ash;
        text(ctx, r.name, x, y);
        r.bars.forEach((v, j) => {
          const by = y + 7 + j * 6;
          const bx = x + 27;
          ctx.fillStyle = COL.ash;
          text(ctx, BAR_LABELS[j], x, by);
          ctx.fillStyle = COL.faint;
          fill(ctx, bx, by + 1, colW - 36, 3);
          ctx.fillStyle = on ? r.color : COL.ash;
          fill(ctx, bx, by + 1, Math.round((colW - 36) * v), 3);
        });
      });
    }
    void time;
    void rand;
    void cycle;
  };
};
