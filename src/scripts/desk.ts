import { reduced } from './lenis';
import { mulberry32, hashSeed } from './rng';
import { pixelSurface, pickShape, stamp, disc, circle, loop, DOT } from './pixels';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Tracks whether an element is on screen, so each object only animates while you can see it. */
function watch(el: Element) {
  const state = { on: false };
  new IntersectionObserver(([e]) => (state.on = e.isIntersecting), { threshold: 0.25 }).observe(el);
  return state;
}

/* ============================ L1: chess ============================ */

// 7x8 pixel pieces. White pieces are ember, black pieces are ink.
const PIECES: Record<string, string[]> = {
  P: ['.......', '...1...', '..111..', '...1...', '..111..', '...1...', '..111..', '.11111.'],
  R: ['1.1.1.1', '1111111', '.11111.', '.11111.', '.11111.', '.11111.', '1111111', '1111111'],
  N: ['..11...', '.11111.', '111.11.', '1..111.', '..1111.', '..1111.', '.11111.', '1111111'],
  B: ['...1...', '..111..', '.11.11.', '.11111.', '..111..', '..111..', '.11111.', '1111111'],
  Q: ['1.1.1.1', '1111111', '.11111.', '..111..', '..111..', '.11111.', '.11111.', '1111111'],
  K: ['...1...', '..111..', '...1...', '.11111.', '..111..', '..111..', '.11111.', '1111111'],
};

function pieceSvg(kind: string) {
  const rows = PIECES[kind];
  let rects = '';
  rows.forEach((row, y) => [...row].forEach((c, x) => (c === '1' ? (rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`) : '')));
  return `<svg viewBox="0 0 7 8" fill="currentColor" aria-hidden="true">${rects}</svg>`;
}

const file = (s: string) => 'abcdefgh'.indexOf(s[0]);
const rank = (s: string) => 8 - Number(s[1]);

// Scholar's mate: 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#
const MOVES: [string, string][] = [['e2', 'e4'], ['e7', 'e5'], ['d1', 'h5'], ['b8', 'c6'], ['f1', 'c4'], ['g8', 'f6'], ['h5', 'f7']];

function initChess() {
  const board = document.querySelector<HTMLElement>('[data-chess]');
  if (!board) return;
  const seen = watch(board);

  const setup = () => {
    board.innerHTML = '';
    for (let i = 0; i < 64; i++) {
      const sq = document.createElement('i');
      sq.className = 'sq' + (((i % 8) + Math.floor(i / 8)) % 2 ? ' dk' : '');
      board.appendChild(sq);
    }
    const map = new Map<string, HTMLElement>();
    const add = (sq: string, kind: string, side: 'w' | 'b') => {
      const p = document.createElement('div');
      p.className = `piece ${side}`;
      p.style.setProperty('--f', String(file(sq)));
      p.style.setProperty('--r', String(rank(sq)));
      p.innerHTML = pieceSvg(kind);
      board.appendChild(p);
      map.set(sq, p);
    };
    const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    'abcdefgh'.split('').forEach((f, i) => {
      add(`${f}8`, back[i], 'b');
      add(`${f}7`, 'P', 'b');
      add(`${f}2`, 'P', 'w');
      add(`${f}1`, back[i], 'w');
    });
    return map;
  };

  const move = (map: Map<string, HTMLElement>, from: string, to: string) => {
    const p = map.get(from);
    if (!p) return;
    const taken = map.get(to);
    if (taken) taken.classList.add('gone');
    map.delete(from);
    map.set(to, p);
    p.style.setProperty('--f', String(file(to)));
    p.style.setProperty('--r', String(rank(to)));
  };

  const mateMarker = () => {
    const m = document.createElement('i');
    m.className = 'mate';
    m.style.setProperty('--f', String(file('e8')));
    m.style.setProperty('--r', String(rank('e8')));
    board.appendChild(m);
  };

  if (reduced) {
    const map = setup();
    MOVES.forEach(([a, b]) => move(map, a, b));
    mateMarker();
    return;
  }

  (async () => {
    for (;;) {
      const map = setup();
      await sleep(900);
      for (const [a, b] of MOVES) {
        while (!seen.on || document.hidden) await sleep(400);
        move(map, a, b);
        await sleep(1150);
      }
      mateMarker();
      await sleep(3200);
    }
  })();
}

/* ============================ L2: shelf ============================ */

function initShelf() {
  const shelf = document.querySelector<HTMLElement>('[data-shelf]');
  const out = document.querySelector<HTMLElement>('[data-shelf-take]');
  if (!shelf || !out) return;
  const idle = out.textContent ?? '';
  shelf.querySelectorAll<HTMLElement>('.spine').forEach((s) => {
    const show = () => (out.textContent = `${s.dataset.title}: ${s.dataset.take}`);
    const hide = () => (out.textContent = idle);
    s.addEventListener('pointerenter', show);
    s.addEventListener('focus', show);
    s.addEventListener('pointerleave', hide);
    s.addEventListener('blur', hide);
  });
}

/* ============================ L3: now ============================ */

function initNow() {
  const root = document.querySelector<HTMLElement>('[data-now]');
  const text = root?.querySelector<HTMLElement>('[data-now-text]');
  if (!root || !text) return;
  const lines: [string, string][] = JSON.parse(root.dataset.lines ?? '[]');
  const render = (upTo: number) =>
    lines
      .map(([k, v], i) => {
        const full = `<span class="k">${k.padEnd(9, ' ')}</span><i>▸</i> ${v}`;
        if (i < upTo) return full;
        return '';
      })
      .filter(Boolean)
      .join('\n');

  if (reduced) {
    text.innerHTML = render(lines.length);
    return;
  }

  const seen = watch(root);
  (async () => {
    for (;;) {
      text.innerHTML = '';
      for (let i = 0; i < lines.length; i++) {
        const [k, v] = lines[i];
        const prefix = render(i);
        const head = `<span class="k">${k.padEnd(9, ' ')}</span><i>▸</i> `;
        for (let c = 0; c <= v.length; c++) {
          while (!seen.on || document.hidden) await sleep(400);
          text.innerHTML = (prefix ? prefix + '\n' : '') + head + v.slice(0, c);
          await sleep(26);
        }
        await sleep(260);
      }
      await sleep(4200);
    }
  })();
}

/* ============================ L4: gravity toy ============================ */

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  shape: [number, number][];
  color: string;
  trail: [number, number][];
}

function initToy() {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-toy]');
  if (!canvas) return;

  const G = 5200;
  const colors = ['#1b1a18', '#e8532f', '#f2a03d', '#5e5c57'];
  const rand = mulberry32(hashSeed('toy'));
  let surf = pixelSurface(canvas, canvas.clientWidth || 260, canvas.clientHeight || 215, 3);
  let bodies: Body[] = [];
  let pulses: { x: number; y: number; age: number }[] = [];
  let idleFor = 0;
  let frames = 0;

  const centre = () => [surf.w / 2, surf.h / 2] as const;

  const launch = (x: number, y: number, factor = 0.65 + rand() * 0.4) => {
    const [cx, cy] = centre();
    let dx = x - cx;
    let dy = y - cy;
    let r = Math.hypot(dx, dy);
    if (r < 9) {
      dx = dx || 9;
      r = Math.max(r, 0.001);
      const k = 9 / r;
      dx *= k;
      dy *= k;
      r = 9;
    }
    const v = Math.sqrt(G / r) * factor;
    const dir = rand() < 0.5 ? 1 : -1;
    bodies.push({
      x: cx + dx, y: cy + dy,
      vx: (-dy / r) * v * dir, vy: (dx / r) * v * dir,
      shape: pickShape(rand), color: colors[Math.floor(rand() * colors.length)], trail: [],
    });
    if (bodies.length > 20) bodies.shift();
  };

  const seed = () => {
    bodies = [];
    const [cx, cy] = centre();
    [14, 20, 27, 33].forEach((r, i) => launch(cx + Math.cos(i * 1.9) * r, cy + Math.sin(i * 1.9) * r * 0.8, 0.95));
  };

  const draw = () => {
    const { ctx, w, h } = surf;
    const [cx, cy] = centre();
    ctx.clearRect(0, 0, w, h);
    for (const b of bodies) {
      b.trail.forEach(([tx, ty], i) => {
        ctx.fillStyle = i < b.trail.length * 0.55 ? '#d9d4c8' : '#b9b7b2';
        ctx.fillRect(Math.round(tx), Math.round(ty), 1, 1);
      });
      ctx.fillStyle = b.color;
      stamp(ctx, b.shape, b.x, b.y);
    }
    pulses.forEach((p) => {
      ctx.fillStyle = '#e8532f';
      circle(ctx, p.x, p.y, 2 + p.age * 16);
    });
    // The hole: a black disc with a thin ember ring.
    ctx.fillStyle = '#1b1a18';
    disc(ctx, cx, cy, 3);
    ctx.fillStyle = '#e8532f';
    circle(ctx, cx, cy, 4);
    ctx.fillStyle = '#f2a03d';
    stamp(ctx, DOT, cx, cy - 6);
  };

  const step = (dt: number) => {
    const [cx, cy] = centre();
    frames++;
    for (let i = bodies.length - 1; i >= 0; i--) {
      const b = bodies[i];
      for (let s = 0; s < 2; s++) {
        const dx = cx - b.x;
        const dy = cy - b.y;
        const r2 = dx * dx + dy * dy + 4;
        const a = G / r2 / Math.sqrt(r2);
        b.vx += dx * a * (dt / 2);
        b.vy += dy * a * (dt / 2);
        b.x += b.vx * (dt / 2);
        b.y += b.vy * (dt / 2);
      }
      if (frames % 2 === 0) {
        b.trail.push([b.x, b.y]);
        if (b.trail.length > 16) b.trail.shift();
      }
      if (Math.hypot(b.x - cx, b.y - cy) < 3.6 || b.x < -30 || b.y < -30 || b.x > surf.w + 30 || b.y > surf.h + 30) {
        pulses.push({ x: cx, y: cy, age: 0 });
        bodies.splice(i, 1);
      }
    }
    pulses = pulses.filter((p) => (p.age += dt * 2.4) < 1);
    idleFor += dt;
    if (bodies.length < 3 && idleFor > 1.5) {
      idleFor = 0;
      const a = rand() * 6.28;
      launch(centre()[0] + Math.cos(a) * 30, centre()[1] + Math.sin(a) * 24, 0.9);
    }
    draw();
  };

  seed();
  draw();

  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    launch(((e.clientX - r.left) / r.width) * surf.w, ((e.clientY - r.top) / r.height) * surf.h);
    idleFor = 0;
    if (reduced) draw();
  });

  const seen = watch(canvas);
  if (reduced) return;
  const wake = loop(step, () => seen.on && !document.hidden);
  new IntersectionObserver(([e]) => e.isIntersecting && wake(), { threshold: 0.25 }).observe(canvas);

  let w = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === w) return;
    w = window.innerWidth;
    surf = pixelSurface(canvas, canvas.clientWidth || 260, canvas.clientHeight || 215, 3);
    seed();
  });
}

/* ============================ glyphs ============================ */

/** A tiny mirrored 5x5 pixel glyph per post, seeded from its slug. */
function initGlyphs() {
  document.querySelectorAll<HTMLCanvasElement>('[data-glyph]').forEach((c) => {
    const rand = mulberry32(hashSeed(c.dataset.glyph ?? 'x'));
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, 5, 5);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 3; x++) {
        if (rand() < 0.5) continue;
        ctx.fillStyle = y === 2 && x === 2 ? '#e8532f' : '#1b1a18';
        ctx.fillRect(x, y, 1, 1);
        ctx.fillRect(4 - x, y, 1, 1);
      }
    }
  });
}

export function initDesk() {
  initGlyphs();
  initChess();
  initShelf();
  initNow();
  initToy();
}
