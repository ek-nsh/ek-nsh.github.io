// SaaS Financial Simulator: a decision enters one node and travels the graph, edge by edge,
// while the audit log writes it down and a branch forks off the timeline.

import { COL, box, fill, line, px, type Builder } from './draw';
import { text, textWidth } from './font';

const NODES = [
  { id: 'PRICE', x: 0.1, y: 0.2, decision: true },
  { id: 'HIRE', x: 0.1, y: 0.5, decision: true },
  { id: 'RAISE', x: 0.1, y: 0.8, decision: true },
  { id: 'CHURN', x: 0.36, y: 0.16 },
  { id: 'MRR', x: 0.36, y: 0.42 },
  { id: 'BURN', x: 0.36, y: 0.7 },
  { id: 'CASH', x: 0.62, y: 0.46 },
  { id: 'CAC', x: 0.62, y: 0.82 },
  { id: 'RUNWAY', x: 0.87, y: 0.28 },
  { id: 'LTV', x: 0.87, y: 0.68 },
];

const EDGES: [number, number][] = [[0, 3], [0, 4], [3, 4], [1, 5], [1, 7], [2, 6], [4, 6], [5, 6], [3, 9], [7, 9], [6, 8], [5, 8]];

/** Directions only, never numbers: this is an illustration, not a forecast. */
const EFFECT: Record<string, Record<string, number>> = {
  PRICE: { MRR: 1, CHURN: 1, CASH: 1, RUNWAY: 1, LTV: -1 },
  HIRE: { BURN: 1, CAC: 1, CASH: -1, RUNWAY: -1, LTV: -1 },
  RAISE: { CASH: 1, RUNWAY: 1 },
};

interface Pulse {
  a: number;
  b: number;
  t: number;
}

export const ledger: Builder = (s, rand, io) => {
  const { ctx, w, h } = s;
  const showText = w >= 150;
  const plotH = h * (showText ? 0.7 : 0.9);
  const pos = NODES.map((n) => [Math.round(8 + n.x * (w - 16)), Math.round(8 + n.y * (plotH - 14))] as [number, number]);

  let clock = 0;
  let quiet = 0;
  let nextAuto = 1.2;
  let cycle = 0;
  let decision = -1;
  let startedAt = 0;
  const litAt: number[] = NODES.map(() => -1);
  const sign: number[] = NODES.map(() => 0);
  let pulses: Pulse[] = [];
  let log: string[] = [];
  let step = 0;
  let branchAt = 0;

  const light = (i: number) => {
    litAt[i] = clock;
    for (const [a, b] of EDGES) if (a === i) pulses.push({ a, b, t: 0 });
  };

  const decide = (i: number) => {
    litAt.fill(-1);
    sign.fill(0);
    pulses = [];
    decision = i;
    startedAt = clock;
    step = 0;
    branchAt = (clock % 18) / 18;
    log = [`T0 ${NODES[i].id} SET`];
    light(i);
  };

  const hoverNode = () => {
    if (!io.live || !io.pointer) return -1;
    let best = -1;
    let bd = 10;
    pos.forEach(([x, y], i) => {
      if (!NODES[i].decision) return;
      const d = Math.hypot(x - io.pointer!.x, y - io.pointer!.y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };

  const arrow = (x: number, y: number, up: boolean) => {
    // 3 wide, 2 tall
    if (up) {
      px(ctx, x + 1, y);
      fill(ctx, x, y + 1, 3, 1);
    } else {
      fill(ctx, x, y, 3, 1);
      px(ctx, x + 1, y + 1);
    }
  };

  return (time, dt) => {
    clock += dt;
    quiet += dt;

    for (const tap of io.taps.splice(0)) {
      if (!io.live) continue;
      pos.forEach(([x, y], i) => {
        if (NODES[i].decision && Math.hypot(x - tap.x, y - tap.y) < 11) {
          quiet = 0;
          decide(i);
        }
      });
    }

    if (clock >= nextAuto && quiet > 5) {
      nextAuto = clock + 7.5;
      decide(cycle++ % 3);
    }
    if (decision >= 0 && clock - startedAt > 6.5) {
      decision = -1;
      litAt.fill(-1);
      sign.fill(0);
    }

    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += dt / 0.55;
      if (p.t < 1) continue;
      pulses.splice(i, 1);
      if (litAt[p.b] < 0 && decision >= 0) {
        sign[p.b] = EFFECT[NODES[decision].id]?.[NODES[p.b].id] ?? 1;
        step += 1;
        log = [...log, `T${step} ${NODES[p.b].id} ${sign[p.b] > 0 ? 'UP' : 'DN'}`].slice(-3);
        light(p.b);
      }
    }

    // ---- draw ----
    ctx.clearRect(0, 0, w, h);

    EDGES.forEach(([a, b]) => {
      const taken = litAt[a] >= 0 && litAt[b] >= 0;
      ctx.fillStyle = taken ? COL.mid : COL.faint;
      line(ctx, pos[a][0], pos[a][1], pos[b][0], pos[b][1], taken ? 2 : 3);
    });

    pulses.forEach((p) => {
      const x = pos[p.a][0] + (pos[p.b][0] - pos[p.a][0]) * p.t;
      const y = pos[p.a][1] + (pos[p.b][1] - pos[p.a][1]) * p.t;
      ctx.fillStyle = COL.ember;
      fill(ctx, x - 1, y - 1, 3, 3);
    });

    const hover = hoverNode();
    NODES.forEach((n, i) => {
      const [x, y] = pos[i];
      const lit = litAt[i] >= 0;
      ctx.fillStyle = COL.paper;
      fill(ctx, x - 3, y - 3, 7, 7);
      ctx.fillStyle = lit ? (i === decision ? COL.amber : COL.ember) : n.decision ? COL.ink : COL.ash;
      if (lit) fill(ctx, x - 2, y - 2, 5, 5);
      else box(ctx, x - 2, y - 2, 5, 5);
      if (lit && i !== decision) {
        ctx.fillStyle = sign[i] > 0 ? COL.ember : COL.mid;
        arrow(x - 1, y - 7, sign[i] > 0);
      }
      if (i === hover) {
        ctx.fillStyle = COL.ink;
        box(ctx, x - 5, y - 5, 11, 11);
      }
      if (showText) {
        ctx.fillStyle = lit ? COL.ink : n.decision ? COL.mid : COL.ash;
        const label = n.id;
        const lx = Math.min(Math.max(x - textWidth(label) / 2, 2), w - textWidth(label) - 2);
        text(ctx, label, lx, y + 5);
      }
    });

    // ---- audit log and the branching timeline ----
    if (showText) {
      ctx.fillStyle = COL.ash;
      text(ctx, 'AUDIT', 6, plotH + 6);
      log.forEach((entry, i) => {
        ctx.fillStyle = i === log.length - 1 ? COL.ink : COL.mid;
        text(ctx, entry, 6, plotH + 14 + i * 6);
      });

      const x0 = Math.round(w * 0.56);
      const x1 = w - 8;
      const y = h - 8;
      ctx.fillStyle = COL.line;
      line(ctx, x0, y, x1, y, 2);
      ctx.fillStyle = COL.ash;
      for (let x = x0; x <= x1; x += 8) px(ctx, x, y - 1);
      const now = x0 + ((clock % 18) / 18) * (x1 - x0);
      ctx.fillStyle = COL.ink;
      fill(ctx, now - 1, y - 1, 3, 3);
      ctx.fillStyle = COL.ash;
      text(ctx, 'MAIN', x0, y + 3 > h - 6 ? y - 12 : y - 12);

      if (decision >= 0) {
        const bx = Math.round(x0 + branchAt * (x1 - x0));
        const by = y - 7;
        ctx.fillStyle = COL.ember;
        line(ctx, bx, y, bx + 3, by, 1);
        line(ctx, bx + 3, by, x1, by, 3);
        const replay = bx + 3 + (((clock - startedAt) * 0.5) % 1) * (x1 - bx - 3);
        fill(ctx, replay - 1, by - 1, 3, 3);
        text(ctx, 'REPLAY', Math.max(x0 + 14, x1 - textWidth('REPLAY')), by - 7);
      }
    }
    void time;
    void rand;
  };
};
