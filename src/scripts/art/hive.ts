// LLM Hive: workers poll the hub (outbound), tasks flow back, a dropped worker's task is rerouted.

import { COL, box, fill, line, px, sprite, ease, clamp, type Builder } from './draw';
import { text, textC, textWidth } from './font';

interface Worker {
  x: number;
  y: number;
  size: number;
  alive: boolean;
  /** Seconds left on the current task (0 = idle). */
  busy: number;
  pollIn: number;
  /** Seconds until an automatically dropped worker comes back (0 = not auto-dropped). */
  back: number;
}

interface Packet {
  from: [number, number];
  to: [number, number];
  t: number;
  dur: number;
  kind: 'poll' | 'task' | 'result';
  worker: number;
}

const DAG: [number, number][] = [[3, 9], [13, 3], [13, 15], [23, 9]];
const DAG_EDGES: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 3]];

export const hive: Builder = (s, rand, io) => {
  const { ctx, w, h } = s;
  const cx = w * 0.5;
  const cy = h * 0.52;
  const rx = Math.min(w * 0.36, h * 1.1);
  const ry = h * 0.34;
  const sizes = [7, 9, 7, 11, 9, 7];
  const showText = w >= 150;

  const workers: Worker[] = sizes.map((size, i) => {
    const a = -Math.PI / 2 + ((i + 0.5) / sizes.length) * Math.PI * 2;
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, size, alive: true, busy: 0, pollIn: 0.4 + i * 0.45, back: 0 };
  });

  let packets: Packet[] = [];
  let stage = 0;
  let flash = 0;
  let quiet = 0; // seconds since the visitor last tapped
  let autoIn = 6;
  let spin = 0;

  const send = (kind: Packet['kind'], i: number, towardHub: boolean, dur = 0.75) => {
    const wk = workers[i];
    packets.push({
      from: towardHub ? [wk.x, wk.y] : [cx, cy],
      to: towardHub ? [cx, cy] : [wk.x, wk.y],
      t: 0,
      dur,
      kind,
      worker: i,
    });
  };

  /** The nearest worker that is up (other than `not`). */
  const alt = (not: number) => {
    let best = -1;
    let bd = Infinity;
    workers.forEach((wk, j) => {
      if (j === not || !wk.alive) return;
      const d = Math.hypot(wk.x - workers[not].x, wk.y - workers[not].y);
      if (d < bd) {
        bd = d;
        best = j;
      }
    });
    return best;
  };

  const drop = (i: number, auto = false) => {
    const wk = workers[i];
    if (!wk.alive) return;
    wk.alive = false;
    wk.back = auto ? 3.6 : 0;
    const hadTask = wk.busy > 0;
    wk.busy = 0;
    packets = packets.filter((p) => !(p.worker === i && p.kind !== 'task'));
    // The hub notices and replans: the lost task goes to the nearest live worker.
    if (hadTask) {
      const j = alt(i);
      if (j >= 0) {
        flash = 1.6;
        send('task', j, false, 0.9);
      }
    }
  };

  const revive = (i: number) => {
    workers[i].alive = true;
    workers[i].back = 0;
    workers[i].pollIn = 0.3;
  };

  const arrive = (p: Packet) => {
    const wk = workers[p.worker];
    if (p.kind === 'poll') {
      if (wk.alive && wk.busy <= 0 && rand() < 0.85) send('task', p.worker, false);
    } else if (p.kind === 'task') {
      if (wk.alive) {
        wk.busy = 1.5;
      } else {
        const j = alt(p.worker);
        if (j >= 0) {
          flash = 1.6;
          send('task', j, false, 0.9);
        }
      }
    } else {
      stage = (stage + 1) % 5;
    }
  };

  return (time, dt) => {
    spin += dt;
    quiet += dt;

    // Visitor taps toggle a worker.
    for (const tap of io.taps.splice(0)) {
      if (!io.live) continue;
      let best = -1;
      let bd = 12;
      workers.forEach((wk, i) => {
        const d = Math.hypot(wk.x - tap.x, wk.y - tap.y);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      if (best >= 0) {
        quiet = 0;
        workers[best].alive ? drop(best) : revive(best);
      }
    }

    // Left alone, a worker drops now and then, so the story plays by itself.
    autoIn -= dt;
    if (autoIn <= 0 && quiet > 4) {
      autoIn = 8.5;
      const up = workers.map((wk, i) => (wk.alive ? i : -1)).filter((i) => i >= 0);
      if (up.length >= 5) {
        const busy = up.filter((i) => workers[i].busy > 0);
        drop((busy.length ? busy : up)[Math.floor(rand() * (busy.length || up.length))], true);
      }
    }

    workers.forEach((wk, i) => {
      if (!wk.alive) {
        if (wk.back > 0 && (wk.back -= dt) <= 0) revive(i);
        return;
      }
      if (wk.busy > 0) {
        wk.busy -= dt;
        if (wk.busy <= 0) {
          send('result', i, true, 0.7);
          wk.pollIn = 0.7;
        }
      } else if ((wk.pollIn -= dt) <= 0) {
        send('poll', i, true, 0.8);
        wk.pollIn = 2.4 + rand() * 0.8;
      }
    });

    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      p.t += dt / p.dur;
      if (p.t >= 1) {
        packets.splice(i, 1);
        arrive(p);
      }
    }
    flash = Math.max(0, flash - dt);

    // ---- draw ----
    ctx.clearRect(0, 0, w, h);

    // links
    workers.forEach((wk) => {
      ctx.fillStyle = wk.alive ? COL.line : COL.faint;
      line(ctx, cx, cy, wk.x, wk.y, 3);
    });

    // the workflow, drawn as a small DAG that lights up as results come back
    if (showText) {
      ctx.fillStyle = COL.ash;
      text(ctx, 'DAG', 6, 3);
      const ox = 6;
      const oy = 11;
      DAG_EDGES.forEach(([a, b]) => {
        ctx.fillStyle = stage > a ? COL.mid : COL.line;
        line(ctx, ox + DAG[a][0], oy + DAG[a][1], ox + DAG[b][0], oy + DAG[b][1], 2);
      });
      DAG.forEach(([x, y], i) => {
        ctx.fillStyle = i < stage ? COL.ember : i === stage ? COL.amber : COL.ash;
        fill(ctx, ox + x - 1, oy + y - 1, 3, 3);
      });
    }

    // packets
    packets.forEach((p) => {
      const t = ease(clamp(p.t, 0, 1));
      const x = p.from[0] + (p.to[0] - p.from[0]) * t;
      const y = p.from[1] + (p.to[1] - p.from[1]) * t;
      if (p.kind === 'poll') {
        ctx.fillStyle = COL.amber;
        px(ctx, x, y);
        px(ctx, x + 1, y);
      } else if (p.kind === 'task') {
        ctx.fillStyle = COL.ember;
        fill(ctx, x - 1, y - 1, 3, 3);
      } else {
        ctx.fillStyle = COL.ink;
        px(ctx, x, y);
        px(ctx, x - 1, y);
        px(ctx, x + 1, y);
        px(ctx, x, y - 1);
        px(ctx, x, y + 1);
      }
    });

    // workers
    workers.forEach((wk, i) => {
      const bw = wk.size;
      const bh = Math.round(wk.size * 0.72);
      const x = Math.round(wk.x - bw / 2);
      const y = Math.round(wk.y - bh / 2);
      if (wk.alive) {
        ctx.fillStyle = COL.paper;
        fill(ctx, x, y, bw, bh);
        ctx.fillStyle = COL.ink;
        box(ctx, x, y, bw, bh);
        if (wk.busy > 0) {
          // a tiny progress bar inside the screen while it works
          ctx.fillStyle = COL.ember;
          fill(ctx, x + 2, y + bh - 3, Math.max(1, (bw - 4) * (1 - wk.busy / 1.5)), 1);
          px(ctx, x + 2, y + 2);
        } else {
          ctx.fillStyle = COL.ash;
          px(ctx, x + 2, y + 2);
        }
        ctx.fillStyle = COL.ink;
        fill(ctx, x + bw / 2 - 1, y + bh, 3, 1); // stand
      } else {
        ctx.fillStyle = COL.ash;
        box(ctx, x, y, bw, bh);
        ctx.fillStyle = COL.ember;
        line(ctx, x + 1, y + 1, x + bw - 2, y + bh - 2);
        line(ctx, x + bw - 2, y + 1, x + 1, y + bh - 2);
      }
      if (showText) {
        ctx.fillStyle = wk.alive ? COL.mid : COL.ash;
        textC(ctx, `W${i + 1}`, wk.x, y + bh + 3);
      }
    });

    // the hub: a diamond that slowly turns its pip
    ctx.fillStyle = COL.ink;
    sprite(ctx, 'hive', Math.round(cx) - 4, Math.round(cy) - 4);
    ctx.fillStyle = COL.ember;
    const pip = Math.floor(spin * 1.5) % 4;
    px(ctx, cx + [0, 2, 0, -2][pip], cy + [-2, 0, 2, 0][pip]);
    if (showText) {
      ctx.fillStyle = COL.mid;
      textC(ctx, 'HUB', cx, cy + 7);
    }

    // messages
    if (showText) {
      if (flash > 0) {
        ctx.fillStyle = COL.amber;
        text(ctx, 'REROUTE', w - textWidth('REROUTE') - 6, 4);
      }
      if (io.live) {
        ctx.fillStyle = COL.ash;
        text(ctx, 'CLICK A WORKER', 6, h - 9);
      }
      ctx.fillStyle = COL.ash;
      const up = workers.filter((wk) => wk.alive).length;
      text(ctx, `${up}/${workers.length} UP`, w - textWidth('6/6 UP') - 6, h - 9);
    }
    void time;
  };
};
