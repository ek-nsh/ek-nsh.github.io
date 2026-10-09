// Change Impact Analysis: commits stream past, a wall marks "now", and the ranking for one file
// may only learn from what is on its left. The ranking is computed live from the synthetic history.

import { COL, box, fill, line, px, clamp, type Builder } from './draw';
import { text, textWidth } from './font';

const FILES = 9;
const CLUSTERS = [[0, 1, 2], [3, 4, 5], [6, 7], [2, 5, 8], [0, 1]];
const FOCUS = 1;

export const cochange: Builder = (s, rand, io) => {
  const { ctx, w, h } = s;
  const showText = w >= 150;
  const x0 = 12;
  const x1 = Math.round(w * (showText ? 0.62 : 0.94));
  const y0 = showText ? 12 : 8;
  const y1 = h - (showText ? 12 : 8);
  const rowH = (y1 - y0) / (FILES - 1);
  const cols = clamp(Math.floor((x1 - x0) / 5), 16, 44);
  const colW = (x1 - x0) / (cols - 1);

  // A synthetic history: each commit touches most of one cluster, plus the odd stray file.
  const commits: number[][] = Array.from({ length: cols }, () => {
    const cluster = CLUSTERS[Math.floor(rand() * CLUSTERS.length)];
    const files = cluster.filter(() => rand() < 0.86);
    if (rand() < 0.3) files.push(Math.floor(rand() * FILES));
    const set = [...new Set(files)];
    return set.length >= 2 ? set.sort((a, b) => a - b) : [...cluster];
  });

  let wall = cols * 0.34;
  let pause = 0;
  let quiet = 0;
  const X = (c: number) => x0 + c * colW;
  const Y = (r: number) => y0 + r * rowH;

  return (time, dt) => {
    quiet += dt;
    for (const tap of io.taps.splice(0)) {
      if (!io.live) continue;
      wall = clamp((tap.x - x0) / colW, 3, cols - 3);
      quiet = 0;
    }
    if (quiet > 5) {
      if (pause > 0) pause -= dt;
      else {
        wall += dt * 1.3;
        if (wall > cols - 3) {
          wall = cols * 0.3;
          pause = 0.8;
        }
      }
    }
    const wc = Math.floor(wall);

    // What the method knows: how often each file changed together with FOCUS, strictly before the wall.
    const count = new Array(FILES).fill(0);
    for (let c = 0; c < wc; c++) if (commits[c].includes(FOCUS)) commits[c].forEach((f) => f !== FOCUS && count[f]++);
    const top = count
      .map((n, f) => ({ f, n }))
      .filter((o) => o.f !== FOCUS)
      .sort((a, b) => b.n - a.n || a.f - b.f)
      .slice(0, 4);
    const next = commits.findIndex((files, c) => c >= wc && files.includes(FOCUS));
    const actual = next >= 0 ? commits[next].filter((f) => f !== FOCUS) : [];
    const hits = top.filter((o) => o.n > 0 && actual.includes(o.f)).length;

    // ---- draw ----
    ctx.clearRect(0, 0, w, h);

    for (let r = 0; r < FILES; r++) {
      ctx.fillStyle = r === FOCUS ? COL.line : COL.faint;
      line(ctx, x0 - 3, Y(r), x1 + 3, Y(r), 4);
      if (showText) {
        ctx.fillStyle = r === FOCUS ? COL.ember : COL.ash;
        text(ctx, `F${r}`, 1, Y(r) - 2);
      }
    }

    commits.forEach((files, c) => {
      const x = Math.round(X(c));
      const past = c < wc;
      const lo = Math.min(...files);
      const hi = Math.max(...files);
      ctx.fillStyle = past ? COL.ash : COL.faint;
      if (hi > lo) line(ctx, x, Y(lo), x, Y(hi), 1);
      files.forEach((f) => {
        const y = Math.round(Y(f));
        if (past) {
          ctx.fillStyle = f === FOCUS ? COL.ember : COL.ink;
          fill(ctx, x - 1, y - 1, 3, 3);
        } else {
          ctx.fillStyle = COL.line;
          box(ctx, x - 1, y - 1, 3, 3);
        }
      });
    });

    // the next commit that touches FOCUS: what really happened, hidden from the method
    if (next >= 0) {
      ctx.fillStyle = COL.ember;
      commits[next].forEach((f) => box(ctx, Math.round(X(next)) - 2, Math.round(Y(f)) - 2, 5, 5));
    }

    // the wall
    const wx = Math.round(x0 + wall * colW - colW / 2);
    ctx.fillStyle = COL.amber;
    line(ctx, wx, y0 - 5, wx, y1 + 5, 2, Math.floor(time * 8));
    if (showText) {
      ctx.fillStyle = COL.ink;
      text(ctx, 'NOW', clamp(wx - 5, 2, x1 - 10), 2);
      ctx.fillStyle = COL.ash;
      if (wx - x0 > 40) text(ctx, 'PAST', Math.max(x0, wx - 24), h - 7);
      if (x1 - wx > 50) text(ctx, 'FUTURE', wx + 5, h - 7);
    }

    // the ranking panel
    if (showText) {
      const px0 = Math.round(w * 0.7);
      const pw = w - px0 - 8;
      ctx.fillStyle = COL.ash;
      text(ctx, `RANK FOR F${FOCUS}`, px0, 6);
      const max = Math.max(1, ...top.map((o) => o.n));
      top.forEach((o, i) => {
        const y = 18 + i * 11;
        const hit = o.n > 0 && actual.includes(o.f);
        ctx.fillStyle = COL.mid;
        text(ctx, `F${o.f}`, px0, y);
        ctx.fillStyle = COL.faint;
        fill(ctx, px0 + 10, y + 1, pw - 18, 3);
        ctx.fillStyle = hit ? COL.ember : COL.ash;
        fill(ctx, px0 + 10, y + 1, Math.round(((pw - 18) * o.n) / max), 3);
        if (hit) {
          ctx.fillStyle = COL.ember;
          px(ctx, px0 + pw - 5, y + 2);
          px(ctx, px0 + pw - 4, y + 3);
          px(ctx, px0 + pw - 3, y + 2);
          px(ctx, px0 + pw - 2, y + 1);
          px(ctx, px0 + pw - 1, y);
        }
      });
      ctx.fillStyle = hits ? COL.ember : COL.ash;
      text(ctx, next >= 0 ? `HIT ${hits}/${top.length}` : 'NO NEXT', px0, h - (io.live ? 17 : 8));
      if (io.live) {
        ctx.fillStyle = COL.ash;
        text(ctx, 'CLICK TO MOVE NOW', Math.round(w * 0.7) - 2, h - 6);
      }
      void textWidth;
    }
  };
};
