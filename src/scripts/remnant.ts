// A supernova remnant drawn once to a canvas: a ragged shell of soft particles,
// thin glowing filaments and a faint blue interior haze. The black hole sits at its
// centre (see hole.ts). A seeded generator keeps it identical on every visit; 1054 is
// a nod to the supernova behind the Crab Nebula.

import { mulberry32, gauss } from './rng';

type RGB = [number, number, number];

const EMBER: RGB = [232, 83, 47];
const AMBER: RGB = [242, 160, 61];
const VIOLET: RGB = [124, 120, 255];

const rgba = (c: RGB, a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

/** A pre-rendered soft dot, so thousands of particles stay cheap. */
function sprite(c: RGB) {
  const s = document.createElement('canvas');
  s.width = s.height = 64;
  const g = s.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, rgba(c, 1));
  grad.addColorStop(0.35, rgba(c, 0.35));
  grad.addColorStop(1, rgba(c, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return s;
}

function fit(canvas: HTMLCanvasElement, w: number, h: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return ctx;
}

export function drawRemnant(canvas: HTMLCanvasElement) {
  const size = canvas.parentElement?.offsetWidth || 900;
  const ctx = fit(canvas, size, size);
  ctx.globalCompositeOperation = 'lighter';

  const rand = mulberry32(1054);
  const c = size / 2;
  const R = size * 0.29;

  // Low-frequency ripple so the shell is lopsided and organic, not a ring.
  const waves = Array.from({ length: 6 }, (_, i) => ({
    f: i + 2,
    a: 0.12 / Math.pow(i + 1, 0.8),
    p: rand() * Math.PI * 2,
  }));
  const shell = (th: number) => waves.reduce((s, w) => s + w.a * Math.sin(w.f * th + w.p), 0);
  const at = (th: number, r: number): [number, number] => [c + Math.cos(th) * r, c + Math.sin(th) * r * 0.94];

  const dots = { ember: sprite(EMBER), amber: sprite(AMBER), violet: sprite(VIOLET) };

  // 1. Diffuse shell: thousands of faint, soft particles.
  for (let i = 0; i < 7500; i++) {
    const th = rand() * Math.PI * 2;
    const r = R * (1 + shell(th)) + gauss(rand) * R * 0.075;
    const [x, y] = at(th, r);
    const inner = r < R * 0.88;
    const s = inner ? dots.violet : rand() < 0.55 ? dots.amber : dots.ember;
    const rad = 2 + rand() * 9;
    ctx.globalAlpha = (inner ? 0.012 : 0.018) + rand() * 0.032;
    ctx.drawImage(s, x - rad, y - rad, rad * 2, rad * 2);
  }

  // 2. Wispy halo just outside the shell.
  for (let i = 0; i < 900; i++) {
    const th = rand() * Math.PI * 2;
    const r = R * (1.12 + Math.abs(gauss(rand)) * 0.16) * (1 + shell(th) * 0.6);
    const [x, y] = at(th, r);
    const rad = 6 + rand() * 18;
    ctx.globalAlpha = 0.008 + rand() * 0.012;
    ctx.drawImage(rand() < 0.5 ? dots.ember : dots.amber, x - rad, y - rad, rad * 2, rad * 2);
  }

  // 3. Filaments: thin glowing threads that wander along the shell.
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  for (let f = 0; f < 80; f++) {
    let th = rand() * Math.PI * 2;
    let r = R * (0.55 + rand() * 0.6);
    const col = rand() < 0.5 ? AMBER : rand() < 0.6 ? EMBER : VIOLET;
    const drift = (rand() - 0.5) * 0.024;
    const steps = 40 + Math.floor(rand() * 90);

    ctx.beginPath();
    ctx.moveTo(...at(th, r));
    for (let s = 0; s < steps; s++) {
      th += drift + (rand() - 0.5) * 0.012;
      r += (R * (1 + shell(th)) - r) * 0.04 + (rand() - 0.5) * R * 0.014;
      ctx.lineTo(...at(th, r));
    }
    ctx.strokeStyle = rgba(col, 0.08 + rand() * 0.2);
    ctx.lineWidth = 0.5 + rand() * 1.1;
    ctx.shadowColor = rgba(col, 0.55);
    ctx.shadowBlur = 7;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // 4. Faint blue haze in the interior, brightest near the centre where the hole will sit.
  const g = ctx.createRadialGradient(c, c, 0, c, c, R * 0.95);
  g.addColorStop(0, rgba(VIOLET, 0.13));
  g.addColorStop(0.7, rgba(VIOLET, 0.045));
  g.addColorStop(1, rgba(VIOLET, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
}

/** A sparse, static star field behind everything. */
export function drawStars(canvas: HTMLCanvasElement) {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  const ctx = fit(canvas, w, h);
  const rand = mulberry32(1987); // SN 1987A

  const count = Math.round((w * h) / 9000);
  for (let i = 0; i < count; i++) {
    const r = 0.35 + Math.pow(rand(), 3) * 1.15;
    const warm = rand() < 0.18;
    ctx.fillStyle = warm ? rgba(AMBER, 0.15 + rand() * 0.5) : `rgba(244, 241, 236, ${0.1 + rand() * 0.5})`;
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
