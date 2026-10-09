// Orbit: scattered links, notes and media drift until they are saved; each one then settles into
// orbit and links to related items of the same topic.

import { COL, fill, line, px, ease, clamp, type Builder } from './draw';
import { text, textWidth } from './font';

type Kind = 'link' | 'note' | 'media';

const LOOK: Record<Kind, string[]> = {
  link: ['.11.11.', '1..1..1', '.11.11.'],
  note: ['1111.', '1..11', '1...1', '1.1.1', '1...1', '11111'],
  media: ['111111', '1.1..1', '1.11.1', '1.1..1', '111111'],
};
const TOPICS = [COL.ember, COL.ink, COL.amber];

interface Item {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: Kind;
  topic: number;
  mode: 'drift' | 'fly' | 'orbit';
  ring: number;
  ang: number;
  speed: number;
  // fly state
  fx: number;
  fy: number;
  ft: number;
  order: number;
}

export const orbit: Builder = (s, rand, io) => {
  const { ctx, w, h } = s;
  const cx = w * 0.5;
  const cy = h * 0.5;
  const showText = w >= 150;
  const rings = [
    { rx: Math.min(w * 0.17, h * 0.55), ry: h * 0.2, dir: 1 },
    { rx: Math.min(w * 0.3, h * 0.95), ry: h * 0.36, dir: -1 },
  ];
  const kinds: Kind[] = ['link', 'note', 'media'];

  const spawn = (x = rand() * w, y = rand() * h): Item => ({
    x, y,
    vx: (rand() - 0.5) * 7, vy: (rand() - 0.5) * 7,
    kind: kinds[Math.floor(rand() * 3)], topic: Math.floor(rand() * 3),
    mode: 'drift', ring: 0, ang: 0, speed: 0, fx: 0, fy: 0, ft: 0, order: 0,
  });

  let items: Item[] = Array.from({ length: 18 }, () => spawn());
  let saved = 0;
  let nextSave = 1.2;
  let clock = 0;
  let hold = 0;

  const save = (it: Item) => {
    it.mode = 'fly';
    it.ft = 0;
    it.fx = it.x;
    it.fy = it.y;
    it.ring = saved % 2;
    it.ang = rand() * Math.PI * 2;
    it.speed = (0.35 + rand() * 0.25) * rings[it.ring].dir;
    it.order = saved++;
  };

  const ringPos = (it: Item): [number, number] => [cx + Math.cos(it.ang) * rings[it.ring].rx, cy + Math.sin(it.ang) * rings[it.ring].ry];

  const scatter = () => {
    items.forEach((it) => {
      it.mode = 'drift';
      const a = Math.atan2(it.y - cy, it.x - cx);
      it.vx = Math.cos(a) * 18;
      it.vy = Math.sin(a) * 12;
    });
    saved = 0;
  };

  const stamp = (it: Item, x: number, y: number) => {
    const rows = LOOK[it.kind];
    const ox = Math.floor(rows[0].length / 2);
    const oy = Math.floor(rows.length / 2);
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '1') px(ctx, x - ox + i, y - oy + j);
    });
  };

  return (time, dt) => {
    clock += dt;

    for (const tap of io.taps.splice(0)) {
      if (!io.live) continue;
      const it = spawn(tap.x, tap.y);
      items.push(it);
      if (items.length > 28) items.shift();
      save(it);
      nextSave = clock + 1.4;
    }

    nextSave -= dt;
    const loose = items.filter((it) => it.mode === 'drift');
    if (nextSave <= 0 && loose.length) {
      nextSave = 1.15;
      save(loose[Math.floor(rand() * loose.length)]);
    }
    if (!loose.length && items.every((it) => it.mode === 'orbit')) {
      hold += dt;
      if (hold > 3.2) {
        hold = 0;
        scatter();
      }
    }

    for (const it of items) {
      if (it.mode === 'drift') {
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.vx *= Math.pow(0.9, dt);
        it.vy *= Math.pow(0.9, dt);
        if (Math.hypot(it.vx, it.vy) < 2) {
          it.vx += (rand() - 0.5) * 4;
          it.vy += (rand() - 0.5) * 4;
        }
        if (it.x < 4 || it.x > w - 4) it.vx *= -1;
        if (it.y < 4 || it.y > h - 4) it.vy *= -1;
        it.x = clamp(it.x, 3, w - 3);
        it.y = clamp(it.y, 3, h - 3);
      } else if (it.mode === 'fly') {
        it.ft += dt / 0.9;
        it.ang += it.speed * dt;
        const [tx, ty] = ringPos(it);
        const e = ease(clamp(it.ft, 0, 1));
        it.x = it.fx + (tx - it.fx) * e;
        it.y = it.fy + (ty - it.fy) * e;
        if (it.ft >= 1) it.mode = 'orbit';
      } else {
        it.ang += it.speed * dt;
        [it.x, it.y] = ringPos(it);
      }
    }

    // ---- draw ----
    ctx.clearRect(0, 0, w, h);

    // orbit tracks
    rings.forEach((r) => {
      ctx.fillStyle = COL.faint;
      for (let a = 0; a < Math.PI * 2; a += 0.07) px(ctx, cx + Math.cos(a) * r.rx, cy + Math.sin(a) * r.ry);
    });

    // Related items link up: each orbiting item reaches for its nearest neighbour on the same topic.
    const inOrbit = items.filter((it) => it.mode === 'orbit');
    const reach = Math.min(w, h * 2) * 0.5;
    const seen = new Set<string>();
    inOrbit.forEach((a, i) => {
      let best = -1;
      let bd = reach;
      inOrbit.forEach((b, j) => {
        if (i === j || a.topic !== b.topic) return;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < bd) {
          bd = d;
          best = j;
        }
      });
      if (best < 0) return;
      const key = i < best ? `${i}-${best}` : `${best}-${i}`;
      if (seen.has(key)) return;
      seen.add(key);
      ctx.fillStyle = TOPICS[a.topic];
      line(ctx, a.x, a.y, inOrbit[best].x, inOrbit[best].y, 3, Math.floor(clock * 6));
    });

    // the core
    ctx.fillStyle = COL.ember;
    fill(ctx, cx - 1, cy - 1, 3, 3);
    px(ctx, cx, cy - 3);
    px(ctx, cx, cy + 3);
    px(ctx, cx - 3, cy);
    px(ctx, cx + 3, cy);

    for (const it of items) {
      ctx.fillStyle = it.mode === 'drift' ? COL.ash : TOPICS[it.topic];
      stamp(it, Math.round(it.x), Math.round(it.y));
    }

    if (showText) {
      ctx.fillStyle = COL.ash;
      text(ctx, 'ORBIT', cx - textWidth('ORBIT') / 2, cy + 7);
      text(ctx, `SAVED ${String(inOrbit.length).padStart(2, '0')}`, 6, 5);
      if (io.live) text(ctx, 'CLICK TO SAVE', 6, h - 9);
    }
    void time;
  };
};
