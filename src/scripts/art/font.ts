// A 3x5 pixel font for labels inside the figures. Uppercase, digits and a few marks.

const G: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '111101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001110',
  '+': '000010111010000', '-': '000000111000000', '>': '100010001010100', '<': '001010100010001',
  '.': '000000000000010', ':': '000010000010000', '%': '101001010100101', '/': '001001010100100',
  '^': '010101000000000', v: '000000000101010', '=': '000111000111000', ' ': '000000000000000',
};

export const GLYPH_W = 4; // 3 pixels plus one of spacing

/** Width of a string in art pixels. */
export const textWidth = (s: string) => Math.max(0, s.length * GLYPH_W - 1);

/** Draw `s` with its top-left corner at (x, y), in the current fill style. */
export function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number) {
  const X = Math.round(x);
  const Y = Math.round(y);
  [...s.toUpperCase()].forEach((ch, i) => {
    const g = G[ch];
    if (!g) return;
    for (let k = 0; k < 15; k++) if (g[k] === '1') ctx.fillRect(X + i * GLYPH_W + (k % 3), Y + Math.floor(k / 3), 1, 1);
  });
}

/** Draw `s` centred on x. */
export function textC(ctx: CanvasRenderingContext2D, s: string, x: number, y: number) {
  text(ctx, s, x - textWidth(s) / 2, y);
}
