type RGB = [number, number, number];

// The warming scale used across the site, like a star ageing: ash → amber → ember.
const STOPS: { at: number; c: RGB }[] = [
  { at: 0, c: [185, 183, 178] },
  { at: 0.55, c: [242, 160, 61] },
  { at: 1, c: [232, 83, 47] },
];

/** CSS colour at position t (0 to 1) along the ash → amber → ember scale. */
export function colorAt(t: number): string {
  const p = Math.min(Math.max(t, 0), 1);
  const hi = STOPS.findIndex((s) => s.at >= p);
  const b = STOPS[hi === -1 ? STOPS.length - 1 : hi];
  const a = STOPS[Math.max(hi - 1, 0)];
  const f = b.at === a.at ? 0 : (p - a.at) / (b.at - a.at);
  const c = a.c.map((v, i) => Math.round(v + (b.c[i] - v) * f));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
