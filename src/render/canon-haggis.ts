// Canonical wild-haggis silhouette — keyed to public/og.svg, which is
// the locked visual brief for the protagonist across the haggis-games
// family. Defining features per canon:
//
//   - Low oval body (≈3.5:1 W:H), dominant mass
//   - Mane drapes asymmetrically over the face-side half of the body
//   - Mane strands cascade PAST the body outline (silhouette broken
//     by hair tips — the iconic feature)
//   - Black face skin protruding BEYOND the body on the face end
//   - Snout protrudes beyond the face; eye mostly hidden by mane
//   - Tiny leg stubs at four corners, tail tuft on the back end
//
// Rendered in profile, facing right by default (toward the WHS door
// on the right-hand wall). AA-smooth Canvas2D primitives, not pixel
// art — the charm depends on the smoothness ([[reference_whs_haggis_drawer]]).
//
// Layering order matches og.svg:
//   ground-shadow → tail → legs → body → fur → belly → mane mass →
//   mane strands → mane crown highlight → face → snout → eye → ear.
//
// Geometry uses a "face-right" coord system. `facingLeft` mirrors the
// whole drawing about the body center.

export interface CanonHaggisContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  globalAlpha: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath?(): void;
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

export interface CanonHaggisPalette {
  ink: string;
  bodyDark: string;
  bodyMid: string;
  bodyLight: string;
  maneDark: string;
  maneMid: string;
  maneLight: string;
  faceSkin: string;
  snoutTip: string;
  heatherShadow: string;
}

// Tokens derived from public/og.svg gradients. Body palette is shifted
// slightly warmer/brighter than the OG card so the haggis reads in the
// dim bothy lighting — the OG sits on a bright neutral; the bothy is
// peat-brown low-light, so the body needs more chroma to stand out.
export const CANON_HAGGIS_PALETTE: CanonHaggisPalette = {
  ink: '#1a0e08',
  bodyDark: '#3a2010',
  bodyMid: '#6a3a18',
  bodyLight: '#a06030',
  maneDark: '#8a6f4a',
  maneMid: '#c4a878',
  maneLight: '#f4d8a0',
  faceSkin: '#0a0604',
  snoutTip: '#7a4a38',
  heatherShadow: '#28182c'
};

export interface CanonHaggisFrame {
  breathY?: number;
  leftLegY?: number;   // back-pair leg offset (design units, + = down)
  rightLegY?: number;  // front-pair leg offset (design units, + = down)
  facingLeft?: boolean;
  maneSway?: number;   // lateral mane oscillation (design units, + = toward face)
}

// Draw the canonical wild-haggis. (cx, cy) is the body center in
// canvas pixels. `scale` multiplies internal coords (1 = native
// ~64-wide footprint, 2 = ~128-wide).
export function drawCanonHaggis(
  ctx: CanonHaggisContext,
  cx: number,
  cy: number,
  scale: number,
  frame: CanonHaggisFrame = {},
  palette: CanonHaggisPalette = CANON_HAGGIS_PALETTE
): void {
  const s = scale;
  const breathY = (frame.breathY ?? 0) * s;
  const leftExtra = (frame.leftLegY ?? 0) * s;
  const rightExtra = (frame.rightLegY ?? 0) * s;
  const dir = frame.facingLeft === true ? -1 : 1;
  // mx/my project face-right design coords into canvas coords with
  // mirroring + breath bob applied.
  const mx = (dx: number): number => cx + dx * dir * s;
  const my = (dy: number): number => cy + dy * s + breathY;
  // mmx offsets mane elements by maneSway along the face axis so the
  // mane mass swings naturally during a trot without moving body/legs.
  const maneSwayX = (frame.maneSway ?? 0) * s * dir;
  const mmx = (dx: number): number => mx(dx) + maneSwayX;

  // ── Ground heather-purple shadow ────────────────────────────────
  fillEllipse(ctx, palette.heatherShadow, 0.55, cx, cy + 24 * s, 60 * s, 6 * s);

  // ── Tail tuft (back end, opposite face) ─────────────────────────
  fillCircle(ctx, palette.bodyMid, 1, mx(-27), my(-1), 5 * s);
  fillCircle(ctx, palette.bodyDark, 0.85, mx(-30), my(-4), 3 * s);
  fillCircle(ctx, palette.maneMid, 0.55, mx(-32), my(-6), 2.2 * s);

  // ── Leg stubs (4 corners) ───────────────────────────────────────
  const legY = 8 * s;
  const legH = 12 * s;
  const legW = 4.5 * s;
  // Back legs
  fillRect(ctx, palette.ink, 1, mx(-17) - legW / 2, my(0) + legY + leftExtra, legW, legH);
  fillRect(ctx, palette.ink, 1, mx(-7)  - legW / 2, my(0) + legY + leftExtra, legW, legH);
  // Front legs (face side)
  fillRect(ctx, palette.ink, 1, mx(7)   - legW / 2, my(0) + legY + rightExtra, legW, legH);
  fillRect(ctx, palette.ink, 1, mx(17)  - legW / 2, my(0) + legY + rightExtra, legW, legH);

  // ── Body — LOW OVAL, dominant ginger-brown mass ─────────────────
  // Outline ring slightly larger so a thin ink rim shows.
  fillEllipse(ctx, palette.ink,      1, cx,      my(2),     52 * s, 17 * s);
  fillEllipse(ctx, palette.bodyMid,  1, cx,      my(2),     48 * s, 14 * s);
  // Belly highlight — warm ginger on the bottom-front quadrant where
  // the dawn light catches.
  fillEllipse(ctx, palette.bodyLight, 0.7, mx(4), my(5), 36 * s, 7 * s);

  // ── Back-half body fur strokes ──────────────────────────────────
  for (let i = 0; i < 7; i++) {
    const fx = mx(-22 + i * 2.4);
    const fy = my(-3 + (i % 2) * 1.4);
    fillRect(ctx, palette.bodyDark, 0.55, fx, fy, 0.9 * s, 1.8 * s);
  }

  // ── Face — small black ellipse protruding past body's face edge.
  //    Drawn BEFORE mane; mane forehead drape will cover the upper
  //    half later, leaving snout + lower face visible. ─────────────
  fillEllipse(ctx, palette.faceSkin, 1, mx(28),   my(4), 14 * s, 11 * s);
  fillEllipse(ctx, palette.ink,      1, mx(28.5), my(5), 11 * s, 8 * s);

  // ── Snout protruding past the face ──────────────────────────────
  fillEllipse(ctx, palette.bodyDark, 1, mx(35), my(6),  9 * s, 4.5 * s);
  fillEllipse(ctx, palette.snoutTip, 1, mx(38), my(7),  5 * s, 3 * s);
  fillCircle(ctx, palette.faceSkin,  1, mx(39), my(6.5), 1.0 * s);

  // ── Mane MASS — compact dome on top-front quadrant of the body.
  //    Crucial: must NOT cover the whole body. The body's back half
  //    stays bare; the mane sits like a wig over the face side. ───
  // Small back-cap (transition into body)
  fillEllipse(ctx, palette.maneDark, 0.9, mmx(2),  my(-4), 18 * s, 10 * s);
  // Main mane crown — the dome
  fillEllipse(ctx, palette.maneMid,  1,   mmx(8),  my(-5), 22 * s, 11 * s);
  // Forehead fringe — covers UPPER face only
  fillEllipse(ctx, palette.maneMid,  1,   mmx(20), my(-2), 14 * s, 9 * s);
  // Darker shadow under the fringe edge
  fillEllipse(ctx, palette.maneDark, 0.85, mmx(22), my(1), 10 * s, 5 * s);

  // ── Eye — peeks out below the mane fringe edge ──────────────────
  fillCircle(ctx, palette.faceSkin, 1, mx(24), my(3),   1.3 * s);
  fillCircle(ctx, palette.maneLight, 1, mx(24.2), my(2.6), 0.5 * s);

  // ── Mane STRANDS cascading down past the body outline ───────────
  // Defining canon feature. Roots tucked under the mane mass edge;
  // tips fall past body bottom (legY=8, body bottom ≈ y=9). All
  // strands sit on the FACE-SIDE (positive x) — back half is bare.
  const strands: readonly { x: number; tipY: number; w: number; color: string }[] = [
    { x:  2,  tipY: 18, w: 2.4, color: palette.maneDark },
    { x:  8,  tipY: 20, w: 2.6, color: palette.maneMid  },
    { x: 13,  tipY: 19, w: 2.4, color: palette.maneDark },
    { x: 18,  tipY: 17, w: 2.2, color: palette.maneMid  }
  ];
  for (const st of strands) {
    fillStrandTaper(ctx, st.color, mmx(st.x), my(4), my(st.tipY), st.w * s);
  }

  // ── Cream highlight on mane crown ───────────────────────────────
  fillEllipse(ctx, palette.maneLight, 0.78, mmx(8),  my(-9), 18 * s, 4 * s);
  fillEllipse(ctx, palette.maneLight, 0.42, mmx(14), my(-6), 10 * s, 2.5 * s);

  // ── Ear — small triangle poking UP through mane top ─────────────
  fillTriangle(ctx, palette.bodyMid, 1,
    mmx(4),  my(-12),
    mmx(9),  my(-7),
    mmx(-1), my(-7));
  fillTriangle(ctx, palette.bodyDark, 1,
    mmx(5),  my(-10),
    mmx(7),  my(-7.5),
    mmx(2),  my(-7.5));
}

// ─── Canvas2D primitive helpers ───────────────────────────────────

function fillCircle(
  ctx: CanonHaggisContext, color: string, alpha: number,
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

function fillEllipse(
  ctx: CanonHaggisContext, color: string, alpha: number,
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

function fillRect(
  ctx: CanonHaggisContext, color: string, alpha: number,
  x: number, y: number, w: number, h: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function fillTriangle(
  ctx: CanonHaggisContext, color: string, alpha: number,
  ax: number, ay: number, bx: number, by: number, cx: number, cy: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.fill();
  ctx.restore();
}

// Mane strand: tapered triangle from a top width to a fine tip.
function fillStrandTaper(
  ctx: CanonHaggisContext, color: string,
  rootX: number, rootY: number, tipY: number, w: number
): void {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(rootX - w / 2, rootY);
  ctx.lineTo(rootX + w / 2, rootY);
  ctx.lineTo(rootX,         tipY);
  ctx.fill();
  ctx.restore();
}
