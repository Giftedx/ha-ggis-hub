// Bothy haggis — the lobby inhabitant. Hub-original procedural drawer.
//
// Design philosophy: COMMITTED FOLK SILHOUETTE. Earlier drafts iterated
// additively — tartan ribbon, thistle, fabric flaps, stitching, fur
// tufts, brow tufts, Minions-style eye-construction, dawn rim crown,
// belly shadow — and stacked into a "Christmas pudding in a Burberry
// cap". The diagnosis from my own roast: every cycle added; nothing
// ever subtracted. The fix is to commit to ONE strong silhouette with
// minimal decoration.
//
// What survived the cut:
//   - One pear body (single fill, NOT layered ellipses)
//   - One tartan band at the cinch — the single Scottish cue
//   - Two black DOT eyes (no whites, no pupils, no catchlights — the
//     folk-art register the previous iterations kept claiming)
//   - Asymmetric drift legs (canon tourist gag)
//   - Heather patch underneath
//   - Two small ribbon-end twists above the band (replaces fabric flaps)
//
// What got cut:
//   - Thistle sprig, fabric flaps, stitching strokes, multi-layer body
//     shading, dawn-lit crown ellipses, belly shadow, snout/muzzle/nose/
//     nostrils/smile, fur tufts, brow tufts, eye whites/pupils/catchlights.
//
// Native scale 1 ≈ 50 wide × 50 tall (including band + legs). Runtime
// scale 3 → ~150 wide. Front-facing (face is just two dots; no
// directional asymmetry to mirror). `facingLeft` only flips the
// asymmetric leg drift.

export interface BothyHaggisContext {
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
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  fill(): void;
  stroke(): void;
  save(): void;
  restore(): void;
}

export interface BothyHaggisPalette {
  readonly outline:      string;   // body silhouette ring
  readonly body:         string;   // single peat-brown fill
  readonly tartanRed:    string;
  readonly tartanGreen:  string;
  readonly tartanCream:  string;
  readonly tartanShadow: string;   // dark rim under the band
  readonly eye:          string;
  readonly legDark:      string;
  readonly heatherShadow: string;
  readonly heatherBloom:  string;
}

// Minimal palette — 10 colours, down from 18 in the bolted-on version.
// No twine, no twineLit, no twineDark, no sackBase/Mid/Lit/Rim/Deep,
// no snoutDark/Hint, no mouthLine, no eyeWhite/Pupil/Catch, no
// stitchInk, no thistlePurple/Stem/Hilite. Just enough to read.
export const BOTHY_HAGGIS_PALETTE: BothyHaggisPalette = {
  outline:        '#1a0e08',
  body:           '#5a3220',
  tartanRed:      '#9c2018',
  tartanGreen:    '#1f4628',
  tartanCream:    '#f4d8a0',
  tartanShadow:   '#3a1410',
  eye:            '#0a0604',
  legDark:        '#1a0e08',
  heatherShadow:  '#28182c',
  heatherBloom:   '#7a4a9c'
};

export interface BothyHaggisFrame {
  readonly breathY?: number;
  /** Mirrors which leg-pair side is short (face is just dots so the
   *  body silhouette is otherwise unchanged). */
  readonly facingLeft?: boolean;
  readonly frontLegY?: number;
  readonly backLegY?: number;
}

export function drawBothyHaggis(
  ctx: BothyHaggisContext,
  cx: number,
  cy: number,
  scale: number,
  frame: BothyHaggisFrame = {},
  palette: BothyHaggisPalette = BOTHY_HAGGIS_PALETTE
): void {
  const s = scale;
  const breathY = (frame.breathY ?? 0) * s;
  const frontLift = (frame.frontLegY ?? 0) * s;
  const backLift = (frame.backLegY ?? 0) * s;
  const dir = frame.facingLeft === true ? -1 : 1;

  // mx/my map design coords to canvas. Body silhouette is symmetric
  // so it does NOT mirror; only the asymmetric legs use `ax`.
  const mx = (dx: number): number => cx + dx * s;
  const my = (dy: number): number => cy + dy * s + breathY;
  const ax = (dx: number): number => cx + dx * dir * s;

  // ── Heather-purple ground patch ────────────────────────────────
  fillEllipseRaw(ctx, palette.heatherShadow, 0.6, cx, my(20), 32 * s, 3.5 * s);
  fillCircle(ctx, palette.heatherBloom, 0.7, mx(-10), my(20.5), 1.0 * s);
  fillCircle(ctx, palette.heatherBloom, 0.55, mx(8), my(21), 0.9 * s);

  // ── Asymmetric drift legs — left pair longer, right pair shorter.
  //    Drawn FIRST so the body covers the leg tops. The drift is the
  //    one canon tourist gag we preserve in the simplified design.
  const legW = 3.0 * s;
  const longH = 7 * s;
  const shortH = 4 * s;
  const legBaseY = my(15);
  const legs: readonly { x: number; long: boolean; lift: number }[] = [
    { x: -10, long: true,  lift: backLift  },
    { x:  -4, long: true,  lift: frontLift },
    { x:   4, long: false, lift: backLift  },
    { x:  10, long: false, lift: frontLift }
  ];
  for (const leg of legs) {
    const lx = ax(leg.x);
    const h = leg.long ? longH : shortH;
    fillRect(ctx, palette.legDark, 1, lx - legW / 2, legBaseY + leg.lift, legW, h);
  }

  // ── Body silhouette — ONE solid pear shape, ONE inner fill. No
  //    layered shading, no crown highlights, no belly shadow. The
  //    shape itself does the work.
  // Outer ink ring
  ctx.save();
  ctx.fillStyle = palette.outline;
  ctx.beginPath();
  ctx.moveTo(mx(-5), my(-11));
  ctx.quadraticCurveTo(mx(-6), my(-13.5), mx(-4), my(-14));
  ctx.quadraticCurveTo(mx(0), my(-14.5), mx(4), my(-14));
  ctx.quadraticCurveTo(mx(6), my(-13.5), mx(5), my(-11));
  ctx.quadraticCurveTo(mx(11), my(-8), mx(15), my(-2));
  ctx.quadraticCurveTo(mx(21), my(7), mx(18), my(14));
  ctx.quadraticCurveTo(mx(11), my(19), mx(0), my(19));
  ctx.quadraticCurveTo(mx(-11), my(19), mx(-18), my(14));
  ctx.quadraticCurveTo(mx(-21), my(7), mx(-15), my(-2));
  ctx.quadraticCurveTo(mx(-11), my(-8), mx(-5), my(-11));
  ctx.fill();
  ctx.restore();

  // Inner peat-brown body — same path scaled in slightly
  ctx.save();
  ctx.fillStyle = palette.body;
  ctx.beginPath();
  ctx.moveTo(mx(-4), my(-10));
  ctx.quadraticCurveTo(mx(-5), my(-12.5), mx(-3), my(-13));
  ctx.quadraticCurveTo(mx(0), my(-13.5), mx(3), my(-13));
  ctx.quadraticCurveTo(mx(5), my(-12.5), mx(4), my(-10));
  ctx.quadraticCurveTo(mx(9.5), my(-7), mx(13.5), my(-2));
  ctx.quadraticCurveTo(mx(19), my(7), mx(16.5), my(13));
  ctx.quadraticCurveTo(mx(10), my(17.5), mx(0), my(17.5));
  ctx.quadraticCurveTo(mx(-10), my(17.5), mx(-16.5), my(13));
  ctx.quadraticCurveTo(mx(-19), my(7), mx(-13.5), my(-2));
  ctx.quadraticCurveTo(mx(-9.5), my(-7), mx(-4), my(-10));
  ctx.fill();
  ctx.restore();

  // ── Tartan band — ONE wrap. Cream base + red+green stripes. This
  //    is the ONE Scottish cue. It sits at the cinch, narrower than
  //    the bolted-on three-band version, so it reads as "cord with
  //    pattern" not "wearing a hat".
  // Shadow underneath
  fillEllipseRaw(ctx, palette.tartanShadow, 1, mx(0), my(-11) + 0.5 * s, 10 * s, 1.2 * s);
  // Cream base
  fillEllipseRaw(ctx, palette.tartanCream, 1, mx(0), my(-11), 10 * s, 1.0 * s);
  // Three small darker stripes (red-green-red) suggesting plaid pattern
  fillEllipseRaw(ctx, palette.tartanRed,   1, mx(-3.5), my(-11), 1.6 * s, 0.95 * s);
  fillEllipseRaw(ctx, palette.tartanGreen, 1, mx(0),    my(-11), 1.6 * s, 0.95 * s);
  fillEllipseRaw(ctx, palette.tartanRed,   1, mx(3.5),  my(-11), 1.6 * s, 0.95 * s);

  // ── Two small ribbon-end twists above the band. Replaces the
  //    fabric flaps; reads as the bow-tail of the tied ribbon rather
  //    than as ears or wings.
  ctx.save();
  ctx.fillStyle = palette.tartanRed;
  ctx.beginPath();
  ctx.moveTo(mx(-1.8), my(-12));
  ctx.quadraticCurveTo(mx(-3.2), my(-14.5), mx(-1), my(-14.5));
  ctx.lineTo(mx(-1.3), my(-12));
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.fillStyle = palette.tartanGreen;
  ctx.beginPath();
  ctx.moveTo(mx(1.3), my(-12));
  ctx.quadraticCurveTo(mx(3.2), my(-14.5), mx(1), my(-14.5));
  ctx.lineTo(mx(1.8), my(-12));
  ctx.fill();
  ctx.restore();

  // ── Eyes — TWO BLACK DOTS. No whites, no pupils, no catchlights.
  //    The folk-art register every previous iteration claimed but
  //    didn't deliver. Round, confident, graphic.
  fillCircle(ctx, palette.eye, 1, mx(-5.5), my(-1), 1.6 * s);
  fillCircle(ctx, palette.eye, 1, mx(5.5),  my(-1), 1.6 * s);
}

// ── Canvas2D helpers ───────────────────────────────────────────────

function fillCircle(
  ctx: BothyHaggisContext, color: string, alpha: number,
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

function fillEllipseRaw(
  ctx: BothyHaggisContext, color: string, alpha: number,
  cx: number, cy: number, rx: number, ry: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function fillRect(
  ctx: BothyHaggisContext, color: string, alpha: number,
  x: number, y: number, w: number, h: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}
