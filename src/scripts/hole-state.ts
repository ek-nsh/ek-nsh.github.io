/**
 * Where the black hole is and how far its dark has spread. The finale writes this on every
 * scroll; the cursor and header read it to know whether they are over the dark.
 */
export const holeState = {
  /** Centre of the hole, in viewport CSS px. */
  cx: 0,
  cy: 0,
  /** Radius of the dark disc, in CSS px (0 = not started). */
  r: 0,
  /** Radius at which the whole viewport is dark. */
  maxR: 1,
  /** 0 to 1 progress through the reveal. */
  p: 0,
};

/** Is a viewport point inside the dark? */
export const insideDark = (x: number, y: number) => holeState.r > 0 && Math.hypot(x - holeState.cx, y - holeState.cy) < holeState.r;
