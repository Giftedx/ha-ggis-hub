// WHS bothy room envelope — direct Canvas2D port of Wild Haggis
// Survivors' `drawRoomEnvelope()` (croft variant). Source:
//   ../../../wild-haggis-survivors/src/art/sprites/croft/interior.ts
//
// Draws the back-wall plaster substrate, peat-stained plank floor, and timber
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
const PEAT_SHADOW = '#2a1a18';
const PEAT_DARK = '#3a261c';
const PEAT_MID = '#6a4528';
const PLASTER_DARK = '#675046';
const PLASTER_MID = '#9a7650';
const PLASTER_LIGHT = '#d8b878';
const WOOD_DARK = '#2a1608';
const WOOD_MID = '#5a3218';
const WOOD_LIGHT = '#8a5a2e';
const WHISKY = '#c8a040';
const WHISKY_LIGHT = '#ffc840';
// Locked door state colours
const LOCKED_FRAME = '#1a0e08';
const LOCKED_HANDLE = '#8a6a30';
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
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    rotation: number,
    a0: number,
    a1: number
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
export function drawWhsBothyWalls(ctx: WhsBothyContext, env: BothyEnvelope): void {
  const { left, right, top, wallBottom, floorBottom, compact } = env;
  const w = right - left;

  // Soft drop-shadow behind the whole envelope (subtle depth).
  fillRectA(ctx, INK, 0.28, left + 5, top + 6, w, floorBottom - top);

  drawBackWall(ctx, left, right, top, wallBottom, compact);
  drawTimberFrame(ctx, left, right, top, wallBottom, compact);

  // Soft inner-corner shadow rails (depth + frame the floor).
  fillRectA(ctx, INK, 0.16, left + 2, top + 2, 8, floorBottom - top - 4);
  fillRectA(ctx, INK, 0.16, right - 10, top + 2, 8, floorBottom - top - 4);
}

/**
 * Draw peat-stained plank floor. ADR-0006: warm peat-stained boards,
 * not flagstones. Planks run parallel to the back wall (horizontal
 * bands), with darker seams between, light grain lines on each plank,
 * and a scatter of knots. Hub overlays its dawn beam on top.
 */
export function drawWhsBothyFloor(ctx: WhsBothyContext, env: BothyEnvelope): void {
  const { left, right, wallBottom, floorBottom, compact } = env;
  const w = right - left;
  const floorH = floorBottom - wallBottom;

  // Underlayment + base body.
  fillRectA(ctx, INK, 1, left, wallBottom, w, floorH);
  fillRectA(ctx, PEAT_DARK, 1, left + 2, wallBottom + 2, w - 4, floorH - 4);

  // Plank bands — alternating PEAT_MID + PEAT_DARK fills with thin
  // PEAT_SHADOW seams between. Planks closer to the back wall are
  // slimmer (perspective), getting taller toward the foreground.
  const plankCount = compact ? 5 : 6;
  let yCursor = wallBottom + 4;
  for (let i = 0; i < plankCount; i++) {
    const t = i / Math.max(1, plankCount - 1);
    // Plank height grows with t (foreshortening — boards farther away
    // look thinner). Range: 14% → 24% of floorH.
    const plankH = Math.round(floorH * (0.14 + t * 0.1));
    const bodyColor = i % 2 === 0 ? PEAT_MID : PEAT_DARK;
    fillRectA(ctx, bodyColor, 1, left + 4, yCursor, w - 8, plankH);
    // Top edge highlight (catches the dawn).
    fillRectA(ctx, PLASTER_LIGHT, 0.12, left + 6, yCursor, w - 12, 1);
    // Grain lines along the plank length — three faint streaks.
    for (let g = 0; g < 3; g++) {
      const gy = yCursor + Math.round(plankH * (0.22 + g * 0.26));
      const alpha = 0.18 + (g % 2) * 0.1;
      strokeLine(ctx, PEAT_SHADOW, alpha, 1, left + 6, gy, right - 6, gy);
    }
    // Bottom seam — a darker line between this plank and the next.
    const seamY = yCursor + plankH;
    strokeLine(ctx, INK, 0.85, 1, left + 4, seamY, right - 4, seamY);
    strokeLine(ctx, PEAT_SHADOW, 0.6, 1, left + 4, seamY + 1, right - 4, seamY + 1);
    yCursor = seamY + 1;
  }
  // Fill any remainder so the floor reaches floorBottom.
  /* v8 ignore next — plank proportions sum to >1.0×floorH; yCursor always overshoots floorBottom */
  if (yCursor < floorBottom - 1) {
    fillRectA(ctx, PEAT_DARK, 1, left + 4, yCursor, w - 8, floorBottom - yCursor - 2);
  }

  // Knots — small dark ellipses scattered across a few planks. Hand-
  // placed (not random) so the visual gate hash stays deterministic.
  const knots: readonly { x: number; y: number; rx: number; ry: number }[] = [
    { x: 0.18, y: 0.22, rx: 5, ry: 3 },
    { x: 0.62, y: 0.38, rx: 6, ry: 4 },
    { x: 0.34, y: 0.58, rx: 7, ry: 5 },
    { x: 0.82, y: 0.71, rx: 5, ry: 3 },
    { x: 0.12, y: 0.84, rx: 8, ry: 5 },
  ];
  for (const k of knots) {
    const kx = left + w * k.x;
    const ky = wallBottom + floorH * k.y;
    fillEllipseA(ctx, INK, 0.65, kx, ky, k.rx, k.ry);
    fillEllipseA(ctx, PEAT_SHADOW, 0.85, kx, ky, k.rx - 1.6, k.ry - 1.2);
    fillEllipseA(ctx, WOOD_LIGHT, 0.22, kx + 0.6, ky - 0.4, k.rx - 3, Math.max(1, k.ry - 2));
  }

  // Warm wash across the centre floor (hearth-glow catch).
  fillEllipseA(
    ctx,
    WHISKY_LIGHT,
    0.045,
    left + w * 0.58,
    wallBottom + floorH * 0.34,
    w * 0.46,
    floorH
  );
}

/**
 * Full envelope (walls + floor). Convenience wrapper.
 */
export function drawWhsBothyEnvelope(ctx: WhsBothyContext, env: BothyEnvelope): void {
  drawWhsBothyWalls(ctx, env);
  drawWhsBothyFloor(ctx, env);
}

function drawBackWall(
  ctx: WhsBothyContext,
  left: number,
  right: number,
  top: number,
  wallBottom: number,
  compact: boolean
): void {
  const w = right - left;
  fillRectA(ctx, INK, 1, left, top, w, wallBottom - top);
  fillRectA(ctx, PLASTER_DARK, 1, left + 2, top + 2, w - 4, wallBottom - top - 3);
  fillRectA(ctx, PLASTER_MID, 1, left + 4, top + 5, w - 8, wallBottom - top - 8);
  // Warm wash across the wall (catches firelight).
  fillEllipseA(
    ctx,
    WHISKY_LIGHT,
    0.055,
    left + w * 0.54,
    top + (wallBottom - top) * 0.58,
    w * 0.78,
    (wallBottom - top) * 0.72
  );
  // Plaster horizontal lines — wall texture.
  for (let y = top + 18; y < wallBottom - 16; y += compact ? 34 : 42) {
    fillRectA(ctx, PLASTER_LIGHT, 0.12, left + 8, y, w - 16, 1);
  }
  // Lower-wall darker band (wainscot / soot line).
  fillRectA(
    ctx,
    PEAT_DARK,
    0.18,
    left + 5,
    wallBottom - (compact ? 54 : 72),
    w - 10,
    compact ? 51 : 69
  );
  fillRectA(ctx, WOOD_LIGHT, 0.16, left + 8, wallBottom - (compact ? 51 : 69), w - 16, 2);

  // Hearth glow across the wall (warm wash low-mid).
  fillEllipseA(
    ctx,
    WHISKY_LIGHT,
    0.11,
    left + w * 0.48,
    wallBottom - (wallBottom - top) * 0.24,
    w * 0.34,
    (wallBottom - top) * 0.42
  );
}

function drawTimberFrame(
  ctx: WhsBothyContext,
  left: number,
  right: number,
  top: number,
  wallBottom: number,
  compact: boolean
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
  x: number,
  y: number,
  w: number,
  h: number,
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
  const frame = state === 'locked' ? LOCKED_FRAME : INK;
  const body = state === 'open' ? WOOD_LIGHT : state === 'locked' ? PEAT_DARK : WOOD_MID;
  const rail = state === 'open' ? WHISKY_LIGHT : WOOD_LIGHT;
  const handleC = state === 'locked' ? LOCKED_HANDLE : WHISKY;

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

// ── Canvas2D helpers ──

function fillRectA(
  ctx: WhsBothyContext,
  color: string,
  alpha: number,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function fillEllipseA(
  ctx: WhsBothyContext,
  color: string,
  alpha: number,
  cx: number,
  cy: number,
  w: number,
  h: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function fillCircleA(
  ctx: WhsBothyContext,
  color: string,
  alpha: number,
  x: number,
  y: number,
  r: number
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
  ctx: WhsBothyContext,
  color: string,
  alpha: number,
  lineW: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
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
