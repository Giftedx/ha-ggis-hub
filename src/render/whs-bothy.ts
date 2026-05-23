// WHS bothy room envelope — direct Canvas2D port of Wild Haggis
// Survivors' `drawRoomEnvelope()` (croft variant). Source:
//   ../../../wild-haggis-survivors/src/art/sprites/croft/interior.ts
//
// Draws the back-wall plaster substrate, flagstone floor, and timber
// ceiling/post/upright beams. Does NOT draw doors, window, or hearth —
// those are separate concerns (hub uses its own doors/window for now,
// and its own WHS hearth port for the fireplace).
//
// Palette retained from WHS croft (warm peat-plaster + dark timber) —
// the hub's dawn-bothy register reads correct against these warm
// substrate colors, because the dawn light is applied as a SEPARATE
// overlay (the cool dawn beam from canvas-room.ts) on top.

// Warm peat/plaster palette (kept from WHS croft — reads right for a
// Highland bothy interior regardless of light register on top).
const INK = '#0a0604';
const PEAT_SHADOW = '#2a1808';
const PEAT_DARK = '#3a2818';
const PEAT_MID = '#5a3e20';
const PLASTER_DARK = '#4a3020';
const PLASTER_MID = '#6a4828';
const PLASTER_LIGHT = '#9a7440';
const WOOD_DARK = '#2a1608';
const WOOD_MID = '#5a3218';
const WOOD_LIGHT = '#8a5a2e';
const WHISKY = '#c8a040';
const WHISKY_LIGHT = '#ffc840';
const LOCH = '#2a4a6a';
const MIST = '#6a90b0';
const HEATHER = '#8060a0';
const HEATHER_LIGHT = '#b090d0';

export interface WhsBothyContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  globalAlpha: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number): void;
  ellipse(
    cx: number, cy: number, rx: number, ry: number,
    rotation: number, a0: number, a1: number
  ): void;
  fill(): void;
  stroke(): void;
  save(): void;
  restore(): void;
}

export interface BothyEnvelope {
  /** Inner-left x of the room (where wall meets floor on the left). */
  left: number;
  /** Inner-right x. */
  right: number;
  /** Top y (back wall starts). */
  top: number;
  /** y where back wall ends and floor begins. */
  wallBottom: number;
  /** y where the floor ends (front edge of room). */
  floorBottom: number;
  /** Set true on narrow viewports to reduce beam count / mortar spacing. */
  compact: boolean;
}

/**
 * Draw walls + timber beams ONLY (no floor). Called when the hub wants
 * to replace its pixel wall substrate but keep its own floor renderer.
 */
export function drawWhsBothyWalls(
  ctx: WhsBothyContext,
  env: BothyEnvelope
): void {
  const { left, right, top, wallBottom, floorBottom, compact } = env;
  const w = right - left;

  // Soft drop-shadow behind the whole envelope (subtle depth).
  fillRectA(ctx, INK, 0.38, left + 5, top + 6, w, floorBottom - top);

  drawBackWall(ctx, left, right, top, wallBottom, compact);
  drawTimberFrame(ctx, left, right, top, wallBottom, compact);

  // Soft inner-corner shadow rails (depth + frame the floor).
  fillRectA(ctx, INK, 0.16, left + 2, top + 2, 8, floorBottom - top - 4);
  fillRectA(ctx, INK, 0.16, right - 10, top + 2, 8, floorBottom - top - 4);
}

/**
 * Draw flagstone floor ONLY. Hub overlays its dawn beam on top.
 */
export function drawWhsBothyFloor(
  ctx: WhsBothyContext,
  env: BothyEnvelope
): void {
  const { left, right, wallBottom, floorBottom, compact } = env;
  const w = right - left;

  fillRectA(ctx, INK, 1, left, wallBottom, w, floorBottom - wallBottom);
  fillRectA(ctx, PEAT_DARK, 1, left + 2, wallBottom + 2, w - 4, floorBottom - wallBottom - 4);
  fillRectA(ctx, PEAT_MID, 1, left + 4, wallBottom + 4, w - 8, floorBottom - wallBottom - 8);
  // Horizontal mortar-line wobble (flagstone courses).
  for (let y = wallBottom + 16; y < floorBottom - 8; y += compact ? 26 : 31) {
    strokeLine(ctx, PEAT_SHADOW, 0.75, 1,
      left + 6, y, right - 6, y + (y % 2 === 0 ? 2 : -2));
  }
  // Vertical-ish mortar lines (stone seams, slight lean for depth).
  const stoneW = compact ? 42 : 56;
  for (let i = 0; i < Math.ceil(w / stoneW); i++) {
    const x = left + i * stoneW + (i % 2 === 0 ? 0 : stoneW * 0.35);
    strokeLine(ctx, PEAT_SHADOW, 0.45, 1,
      x, wallBottom + 5, x - stoneW * 0.22, floorBottom - 6);
  }
  // Warm wash across the centre floor (hearth-glow catch).
  fillEllipseA(ctx, WHISKY_LIGHT, 0.045,
    left + w * 0.58, wallBottom + (floorBottom - wallBottom) * 0.34, w * 0.46, floorBottom - wallBottom);
}

/**
 * Full envelope (walls + floor). Convenience wrapper.
 */
export function drawWhsBothyEnvelope(
  ctx: WhsBothyContext,
  env: BothyEnvelope
): void {
  drawWhsBothyWalls(ctx, env);
  drawWhsBothyFloor(ctx, env);
}

function drawBackWall(
  ctx: WhsBothyContext,
  left: number, right: number, top: number, wallBottom: number, compact: boolean
): void {
  const w = right - left;
  fillRectA(ctx, INK, 1, left, top, w, wallBottom - top);
  fillRectA(ctx, PLASTER_DARK, 1, left + 2, top + 2, w - 4, wallBottom - top - 3);
  fillRectA(ctx, PLASTER_MID, 1, left + 4, top + 5, w - 8, wallBottom - top - 8);
  // Warm wash across the wall (catches firelight).
  fillEllipseA(ctx, WHISKY_LIGHT, 0.055,
    left + w * 0.54, top + (wallBottom - top) * 0.58, w * 0.78, (wallBottom - top) * 0.72);
  // Plaster horizontal lines — wall texture.
  for (let y = top + 18; y < wallBottom - 16; y += compact ? 34 : 42) {
    fillRectA(ctx, PLASTER_LIGHT, 0.12, left + 8, y, w - 16, 1);
  }
  // Lower-wall darker band (wainscot / soot line).
  fillRectA(ctx, PEAT_DARK, 0.18, left + 5, wallBottom - (compact ? 54 : 72), w - 10, compact ? 51 : 69);
  fillRectA(ctx, WOOD_LIGHT, 0.16, left + 8, wallBottom - (compact ? 51 : 69), w - 16, 2);

  // Hearth glow across the wall (warm wash low-mid).
  fillEllipseA(ctx, WHISKY_LIGHT, 0.11,
    left + w * 0.48, wallBottom - (wallBottom - top) * 0.24, w * 0.34, (wallBottom - top) * 0.42);
}

function drawTimberFrame(
  ctx: WhsBothyContext,
  left: number, right: number, top: number, wallBottom: number, compact: boolean
): void {
  const w = right - left;
  // Ceiling beam + wall-floor seam beam.
  drawBeam(ctx, left - 3, top - 7, w + 6, 12, true);
  drawBeam(ctx, left - 3, wallBottom - 8, w + 6, 14, true);
  // Side posts.
  drawBeam(ctx, left - 5, top - 3, 12, wallBottom - top + 5, false);
  drawBeam(ctx, right - 7, top - 3, 12, wallBottom - top + 5, false);
  // Vertical interior uprights (subtle).
  const beamCount = compact ? 3 : 6;
  for (let i = 1; i <= beamCount; i++) {
    const x = left + (w / (beamCount + 1)) * i;
    drawBeam(ctx, x - 2, top - 2, 4, wallBottom - top - 6, false, 0.2);
  }
}

function drawBeam(
  ctx: WhsBothyContext,
  x: number, y: number, w: number, h: number,
  horizontal: boolean,
  alpha = 1
): void {
  fillRectA(ctx, INK, alpha, x, y, w, h);
  fillRectA(ctx, WOOD_DARK, alpha, x + 1, y + 1, w - 2, h - 2);
  fillRectA(ctx, WOOD_MID, alpha, x + 2, y + 2, w - 4, h - 4);
  if (horizontal) {
    fillRectA(ctx, WOOD_LIGHT, alpha * 0.55, x + 3, y + 2, w - 6, 1);
  } else {
    fillRectA(ctx, WOOD_LIGHT, alpha * 0.55, x + 2, y + 3, 1, h - 6);
  }
}

// Render a smooth window bay (loch view + mountains + dawn sun glow +
// cross mullion + wood sill + heather curtains either side). Region
// is the inner pane rect — the function paints the wood frame outside
// it. Port of WHS drawWindowBay (interior.ts).
export function drawWhsWindowBay(
  ctx: WhsBothyContext,
  region: { x: number; y: number; w: number; h: number },
  compact: boolean
): void {
  const { x, y, w, h } = region;
  // Outer wood frame (ink + dark wood backing).
  fillRectA(ctx, INK, 1, x - 7, y - 8, w + 14, h + 16);
  fillRectA(ctx, WOOD_DARK, 1, x - 5, y - 6, w + 10, h + 12);
  // Loch background — calm deep loch water reading as the daytime sky.
  fillRectA(ctx, LOCH, 1, x, y, w, h);
  // Mist band — upper-half sky / morning haze.
  fillRectA(ctx, MIST, 0.85, x + 2, y + 2, w - 4, h * 0.45);
  // Distant mountains — two overlapping triangles, mid + dark green.
  fillTriangleA(ctx, '#354c2c', 1,
    x + 2, y + h - 4, x + w * 0.42, y + h * 0.4, x + w * 0.66, y + h - 4);
  fillTriangleA(ctx, '#253820', 1,
    x + w * 0.34, y + h - 4, x + w * 0.72, y + h * 0.34, x + w - 2, y + h - 4);
  // Dawn sun glow ellipse.
  fillEllipseA(ctx, '#d4b055', 0.16,
    x + w * 0.72, y + h * 0.28, compact ? 12 : 18, compact ? 7 : 10);
  // Water ripples — three soft ellipses on the lower water.
  for (let i = 0; i < 3; i++) {
    fillEllipseA(ctx, '#dde8e8', 0.32,
      x + w * (0.26 + i * 0.2), y + h * (0.66 + i * 0.04), w * 0.34, 4);
  }
  // Cross mullion.
  fillRectA(ctx, WOOD_DARK, 1, x + w * 0.5 - 2, y, 4, h);
  fillRectA(ctx, WOOD_DARK, 1, x, y + h * 0.48 - 2, w, 4);
  fillRectA(ctx, WOOD_LIGHT, 0.75, x + w * 0.5 - 1, y + 3, 1, h - 6);
  fillRectA(ctx, WOOD_LIGHT, 0.75, x + 3, y + h * 0.48 - 1, w - 6, 1);
  // Wood sill (extends past the window left/right).
  fillRectA(ctx, INK, 1, x - 12, y + h - 3, w + 24, 8);
  fillRectA(ctx, WOOD_MID, 1, x - 10, y + h - 2, w + 20, 5);
  fillRectA(ctx, WOOD_LIGHT, 0.8, x - 8, y + h - 2, w + 16, 1);

  // Heather curtains either side (tied back with whisky-gold tie).
  drawCurtain(ctx, x - 15, y - 3, compact ? 13 : 18, h + 5, true);
  drawCurtain(ctx, x + w - 3, y - 3, compact ? 13 : 18, h + 5, false);
}

function drawCurtain(
  ctx: WhsBothyContext,
  x: number, y: number, w: number, h: number,
  leftSide: boolean
): void {
  fillRectA(ctx, INK, 1, x, y, w, h);
  fillRectA(ctx, HEATHER, 1, x + 1, y + 1, w - 2, h - 2);
  // Vertical folds (3 thin stripes).
  for (let i = 0; i < 3; i++) {
    const foldX = x + 3 + i * Math.max(3, w / 3.5);
    fillRectA(ctx, HEATHER_LIGHT, 0.28, foldX, y + 3, 1, h - 6);
  }
  // Whisky-gold tieback triangle, pinned to inner edge.
  const tieY = y + h * 0.58;
  if (leftSide) {
    fillTriangleA(ctx, WHISKY, 0.85, x + w, tieY - 5, x + w, tieY + 5, x + w * 0.42, tieY);
  } else {
    fillTriangleA(ctx, WHISKY, 0.85, x, tieY - 5, x, tieY + 5, x + w * 0.58, tieY);
  }
}

// Render a smooth door inside the wall. `state` controls the palette
// (open = lit wood, locked = dark wood, available = mid wood).
// Region is the door RECT in canvas coords. Port of WHS drawDoor.
export function drawWhsDoor(
  ctx: WhsBothyContext,
  region: { x: number; y: number; w: number; h: number },
  state: 'open' | 'locked' | 'available'
): void {
  const { x, y, w, h } = region;
  // Palette per state.
  const frame = state === 'locked' ? '#1a0e08' : INK;
  const body = state === 'open' ? WOOD_LIGHT : state === 'locked' ? PEAT_DARK : WOOD_MID;
  const rail = state === 'open' ? WHISKY_LIGHT : WOOD_LIGHT;
  const handleC = state === 'locked' ? '#8a6a30' : WHISKY;

  fillRectA(ctx, frame, 1, x - 3, y - 4, w + 6, h + 6);
  fillRectA(ctx, PEAT_DARK, 1, x, y, w, h);
  fillRectA(ctx, body, 1, x + 3, y + 4, w - 6, h - 8);
  // Vertical central plank seam.
  fillRectA(ctx, WOOD_DARK, 0.85, x + w * 0.5 - 1, y + 7, 2, h - 14);
  // Horizontal rails.
  for (const row of [0.24, 0.56]) {
    fillRectA(ctx, rail, 0.5, x + 8, y + h * row, w - 16, 2);
  }
  // Brass handle.
  fillCircleA(ctx, handleC, 1, x + w - 12, y + h * 0.52, 2.6);
  // Door shadow on floor below.
  fillEllipseA(ctx, INK, 0.25, x + w * 0.5, y + h + 4, w * 0.9, 8);
}

// Oval heather rug (PEAT_DARK + HEATHER + tartan stripes + cream
// fringe). Port of WHS drawRug. Place under the haggis-hearth axis
// for floor warmth + central anchor.
const TARTAN_RED = '#c42828';
const CREAM = '#d6b878';

export function drawWhsRug(
  ctx: WhsBothyContext,
  x: number, y: number, w: number, h: number,
  compact: boolean
): void {
  // Drop shadow.
  fillEllipseA(ctx, INK, 0.35, x + w / 2 + 2, y + h * 0.58 + 4, w * 0.96, h * 1.05);
  // Base layered ellipses — DAWN BOTHY register (warm peat + dawn
  // gold + warm wood). Replaced heather-purple per hub palette.
  fillEllipseA(ctx, INK, 1, x + w / 2, y + h * 0.52, w, h);
  fillEllipseA(ctx, PEAT_DARK, 1, x + w / 2, y + h * 0.50, w - 4, h - 4);
  fillEllipseA(ctx, '#6a3818', 1, x + w / 2, y + h * 0.49, w - 10, h - 8);   // warm wood mid
  fillEllipseA(ctx, '#8a5828', 0.3, x + w / 2 - w * 0.08, y + h * 0.42, w * 0.44, h * 0.34);

  // Tartan-style cross-stripes — dawn ember + whisky-gold instead of
  // heather/red. Reads as a hand-woven wool rug in firelight.
  const stripeH = compact ? 3 : 5;
  const stripeW = compact ? 3 : 5;
  fillRectA(ctx, PEAT_DARK, 0.78, x + w * 0.08, y + h * 0.42, w * 0.84, stripeH);
  fillRectA(ctx, PEAT_DARK, 0.78, x + w * 0.08, y + h * 0.57, w * 0.84, Math.max(2, stripeH - 1));
  fillRectA(ctx, '#9a3818', 0.7, x + w * 0.18, y + h * 0.24, stripeW, h * 0.50);  // ember red
  fillRectA(ctx, '#9a3818', 0.7, x + w * 0.70, y + h * 0.24, stripeW, h * 0.50);
  fillRectA(ctx, WHISKY, 0.78, x + w * 0.10, y + h * 0.51, w * 0.8, Math.max(2, stripeH - 2));
  fillRectA(ctx, WHISKY, 0.78, x + w * 0.36, y + h * 0.28, Math.max(2, stripeW - 1), h * 0.44);
  void TARTAN_RED;

  // Cream fringe along the front edge.
  for (let i = 0; i < 7; i++) {
    const fringeX = x + w * (0.16 + i * 0.11);
    fillRectA(ctx, CREAM, 0.48, fringeX, y + h * 0.79, 2, compact ? 4 : 6);
  }
}

// Mantelpiece on the back wall above the hearth — shelf plank +
// brass candlestick (left) + framed sepia photo (right). Port of
// WHS drawMantelpieceShelf + drawMantelCandle + drawMantelPhoto.
const SHELF_WOOD_DARK = '#3a2414';
const SHELF_WOOD_MID = '#5a3a20';
const SHELF_WOOD_HI = '#7a5a38';
const BRASS_DARK = '#6a4a18';
const BRASS_MID = '#a07a30';
const BRASS_HI = '#e8c860';
const WAX_BODY = '#eadfb0';
const WAX_DRIP = '#c8b88a';
const WICK = '#1a0a04';
const FLAME_OUTER_C = '#ff8a40';
const FLAME_INNER_C = '#ffe080';
const FRAME_DARK = '#3a2010';
const FRAME_MID = '#6a4218';
const FRAME_HI = '#9a6830';
const PHOTO_SEPIA = '#c89868';
const PHOTO_SEPIA_HI = '#e8c890';
const PHOTO_INK = '#4a2a18';

export function drawWhsMantelpiece(
  ctx: WhsBothyContext,
  shelf: { x: number; y: number; w: number; h: number }
): void {
  const { x, y, w, h } = shelf;

  // Shelf plank — drop-shadow + ink frame + wood layering.
  fillRectA(ctx, '#000000', 0.3, x + 2, y + h - 1, w - 4, 3);
  fillRectA(ctx, INK, 1, x, y, w, h);
  fillRectA(ctx, SHELF_WOOD_DARK, 1, x + 1, y + 1, w - 2, h - 2);
  fillRectA(ctx, SHELF_WOOD_MID, 1, x + 2, y + 2, w - 4, Math.max(2, h - 5));
  fillRectA(ctx, SHELF_WOOD_HI, 0.7, x + 2, y + 2, w - 4, 1);
  // Grain streaks.
  for (let i = 0; i < Math.floor(w / 28); i++) {
    const gx = x + 6 + i * 28 + (i % 2 === 0 ? 0 : 5);
    fillRectA(ctx, SHELF_WOOD_DARK, 0.7, gx, y + 2, 1.2, h - 4);
  }

  // Candle on the LEFT corner. Position: just inside the shelf edge.
  drawCandle(ctx, x + 14, y - 1);
  // Photo on the RIGHT corner.
  drawPhoto(ctx, x + w - 14, y - 1);
}

function drawCandle(ctx: WhsBothyContext, cx: number, cy: number): void {
  // Base saucer.
  fillEllipseA(ctx, INK, 1, cx, cy, 9, 3.2);
  fillEllipseA(ctx, BRASS_DARK, 1, cx, cy, 7.5, 2.4);
  fillEllipseA(ctx, BRASS_MID, 1, cx, cy - 0.2, 5.5, 1.4);
  // Stem.
  fillRectA(ctx, INK, 1, cx - 1.5, cy - 6, 3, 6);
  fillRectA(ctx, BRASS_MID, 1, cx - 1, cy - 5.5, 2, 5.5);
  fillRectA(ctx, BRASS_HI, 0.85, cx - 0.6, cy - 5.5, 0.6, 5);
  // Cup at top of stem.
  fillEllipseA(ctx, INK, 1, cx, cy - 6, 5, 2);
  fillEllipseA(ctx, BRASS_DARK, 1, cx, cy - 6, 4, 1.4);
  fillEllipseA(ctx, BRASS_HI, 1, cx - 0.8, cy - 6.2, 1.6, 0.5);
  // Wax taper.
  fillRectA(ctx, INK, 1, cx - 1.4, cy - 12, 2.8, 6);
  fillRectA(ctx, WAX_BODY, 1, cx - 1, cy - 11.6, 2, 5.4);
  fillRectA(ctx, WAX_DRIP, 0.9, cx - 0.4, cy - 7, 0.8, 1.6);
  // Wick + flame.
  fillRectA(ctx, WICK, 1, cx - 0.3, cy - 13.6, 0.6, 1.8);
  fillEllipseA(ctx, FLAME_OUTER_C, 1, cx, cy - 14.2, 1.8, 2.4);
  fillEllipseA(ctx, FLAME_INNER_C, 1, cx, cy - 14.4, 0.9, 1.4);
}

function drawPhoto(ctx: WhsBothyContext, cx: number, cy: number): void {
  const fw = 14;
  const fh = 16;
  const fx = cx - fw / 2;
  const fy = cy - fh - 1;
  // Outer frame.
  fillRectA(ctx, INK, 1, fx, fy, fw, fh);
  fillRectA(ctx, FRAME_DARK, 1, fx + 0.6, fy + 0.6, fw - 1.2, fh - 1.2);
  fillRectA(ctx, FRAME_MID, 1, fx + 1.5, fy + 1.5, fw - 3, fh - 3);
  fillRectA(ctx, FRAME_HI, 0.85, fx + 1.5, fy + 1.5, fw - 3, 0.6);
  // Photo plate.
  const pw = fw - 4;
  const ph = fh - 5;
  const ppx = fx + 2;
  const ppy = fy + 2;
  fillRectA(ctx, INK, 1, ppx, ppy, pw, ph);
  fillRectA(ctx, PHOTO_SEPIA, 1, ppx + 0.5, ppy + 0.5, pw - 1, ph - 1);
  fillRectA(ctx, PHOTO_SEPIA_HI, 0.8, ppx + 0.5, ppy + 0.5, pw - 1, 1.2);
  // Tiny haggis silhouette.
  const hx = ppx + pw / 2;
  const hy = ppy + ph - 2.4;
  fillEllipseA(ctx, PHOTO_INK, 1, hx, hy, 5, 3.2);
  fillTriangleA(ctx, PHOTO_INK, 1, hx - 1.6, hy - 1.6, hx - 0.8, hy - 3, hx - 0.4, hy - 1.6);
  fillTriangleA(ctx, PHOTO_INK, 1, hx + 0.4, hy - 1.6, hx + 0.8, hy - 3, hx + 1.6, hy - 1.6);
  // Foot of frame catches brass kiss from candle.
  fillRectA(ctx, BRASS_HI, 0.25, fx + 0.6, fy + fh - 1.4, fw - 1.2, 0.8);
}

// ── Canvas2D helpers ──

function fillRectA(
  ctx: WhsBothyContext, color: string, alpha: number,
  x: number, y: number, w: number, h: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function fillEllipseA(
  ctx: WhsBothyContext, color: string, alpha: number,
  cx: number, cy: number, w: number, h: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function fillTriangleA(
  ctx: WhsBothyContext, color: string, alpha: number,
  x1: number, y1: number, x2: number, y2: number, x3: number, y3: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.fill();
  ctx.restore();
}

function fillCircleA(
  ctx: WhsBothyContext, color: string, alpha: number,
  x: number, y: number, r: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function strokeLine(
  ctx: WhsBothyContext, color: string, alpha: number, lineW: number,
  x1: number, y1: number, x2: number, y2: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}
