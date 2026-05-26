// Bothy haggis - the lobby inhabitant. Hub-original procedural drawer.
//
// Design philosophy: THE WEE CHIEFTAIN. This is not a taxidermy-style
// wild haggis. It is the joke made playable: a whole haggis pudding
// that has come alive in the bothy. Food-shaped first, creature second.
//
// Read cues:
//   - squat whole-haggis oval, wider than tall
//   - glossy cooked casing with seams and tied ends
//   - pale oat cutaway with casing lip as the dominant food tell
//   - big cream eyes for WHS-level readability
//   - compact tartan-twine collar for Scottish flavour, not a hat
//   - tiny uneven legs for the haggis-family drift gag
//
// Native scale 1 is about 58 wide by 42 tall including legs. The room
// renderer currently uses scale 2.7 to stay bold without swallowing
// the bothy doorway.

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
  readonly outline: string;
  readonly casingDeep: string;
  readonly casingMid: string;
  readonly casingLight: string;
  readonly casingHighlight: string;
  readonly casingSeam: string;
  readonly crumbLight: string;
  readonly crumbDark: string;
  readonly crumbMid: string;
  readonly oatFleck: string;
  readonly eyeWhite: string;
  readonly eyePupil: string;
  readonly eyeGlint: string;
  readonly mouth: string;
  readonly legDark: string;
  readonly twine: string;
  readonly twineShadow: string;
  readonly tartanRed: string;
  readonly tartanGreen: string;
  readonly heatherShadow: string;
  readonly heatherBloom: string;
}

export const BOTHY_HAGGIS_PALETTE: BothyHaggisPalette = {
  outline: '#1a0e08',
  casingDeep: '#3a1e12',
  casingMid: '#7a3f24',
  casingLight: '#9c5630',
  casingHighlight: '#b46a38',
  casingSeam: '#2a1408',
  crumbLight: '#f4d8a0',
  crumbDark: '#3a2a1a',
  crumbMid: '#6a4a28',
  oatFleck: '#d8b46a',
  eyeWhite: '#f0e6c8',
  eyePupil: '#0a0604',
  eyeGlint: '#fff0c8',
  mouth: '#2a1408',
  legDark: '#1a0e08',
  twine: '#c4a878',
  twineShadow: '#5a3a20',
  tartanRed: '#9c2018',
  tartanGreen: '#1f4628',
  heatherShadow: '#28182c',
  heatherBloom: '#7a4a9c'
};

export interface BothyHaggisFrame {
  readonly breathY?: number;
  /** Mirrors which leg-pair side is short. The food body stays front-facing. */
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

  // Heather-purple grounding patch.
  fillEllipseRaw(ctx, palette.heatherShadow, 0.58, cx, my(19), 34 * s, 3.7 * s);
  fillCircle(ctx, palette.heatherBloom, 0.72, mx(-12), my(19.5), 1.0 * s);
  fillCircle(ctx, palette.heatherBloom, 0.58, mx(11), my(20), 0.9 * s);

  // Tiny asymmetric legs. Draw first so casing covers their tops.
  const legW = 2.7 * s;
  const longH = 5.5 * s;
  const shortH = 3.8 * s;
  const legBaseY = my(11);
  const legs: readonly { x: number; long: boolean; lift: number }[] = [
    { x: -14, long: true, lift: backLift },
    { x: -6, long: true, lift: frontLift },
    { x: 7, long: false, lift: backLift },
    { x: 15, long: false, lift: frontLift }
  ];
  for (const leg of legs) {
    const lx = ax(leg.x);
    const h = leg.long ? longH : shortH;
    fillRect(ctx, palette.legDark, 1, lx - legW / 2, legBaseY + leg.lift, legW, h);
    fillEllipseRaw(
      ctx,
      palette.legDark,
      1,
      lx,
      legBaseY + h + leg.lift + (leg.long ? 1.5 : 2.4) * s,
      (leg.long ? 3.2 : 2.7) * s,
      (leg.long ? 1.1 : 1.0) * s
    );
  }

  // Whole-haggis casing: outline, cooked mid-tone, then a smaller lit face.
  fillEllipseRaw(ctx, palette.outline, 1, cx, my(1), 25 * s, 15 * s);
  fillEllipseRaw(ctx, palette.casingMid, 1, cx, my(0), 22 * s, 12.5 * s);
  fillEllipseRaw(ctx, palette.casingLight, 0.68, mx(-5), my(-3.5), 15 * s, 7.5 * s);
  fillEllipseRaw(ctx, palette.casingDeep, 0.5, mx(6), my(7), 15 * s, 4.2 * s);
  fillEllipseRaw(ctx, palette.casingHighlight, 0.58, mx(-8), my(-8), 9 * s, 2.6 * s);
  fillEllipseRaw(ctx, palette.casingDeep, 0.55, cx, my(11.3), 20 * s, 2.2 * s);
  fillEllipseRaw(ctx, palette.casingSeam, 0.42, mx(-20.8), my(1.8), 2.1 * s, 6.2 * s);
  fillEllipseRaw(ctx, palette.casingSeam, 0.48, mx(21.2), my(1.6), 2.4 * s, 6.8 * s);
  fillEllipseRaw(ctx, palette.casingHighlight, 0.36, mx(18.2), my(-6.3), 2.5 * s, 4.2 * s);

  // Asymmetric tied casing. One small pucker and trailing string reads
  // as food packaging; two large side blobs read as ears.
  strokeCurve(ctx, palette.casingSeam, 0.52, 0.9 * s, mx(-21), my(-3), mx(-19), my(1), mx(-21), my(5));
  fillEllipseRaw(ctx, palette.outline, 1, mx(23), my(4), 2.4 * s, 3.5 * s);
  fillEllipseRaw(ctx, palette.casingDeep, 1, mx(22.5), my(4), 1.45 * s, 2.5 * s);
  fillRect(ctx, palette.twineShadow, 0.9, mx(20.2), my(-0.9), 1.15 * s, 8 * s);
  fillRect(ctx, palette.twine, 0.9, mx(22.6), my(0.2), 0.9 * s, 6.2 * s);
  fillCircle(ctx, palette.twine, 0.95, mx(21.65), my(1.6), 1.15 * s);
  fillCircle(ctx, palette.twineShadow, 0.85, mx(24.2), my(2.8), 1.15 * s);
  fillCircle(ctx, palette.twine, 0.76, mx(24.2), my(2.8), 0.72 * s);
  fillCircle(ctx, palette.tartanRed, 0.95, mx(21.85), my(2.1), 0.52 * s);
  fillCircle(ctx, palette.tartanGreen, 0.95, mx(21.95), my(4.2), 0.48 * s);
  strokeCurve(ctx, palette.twine, 0.8, 0.7 * s, mx(22.6), my(1.6), mx(24.4), my(1.1), mx(25.4), my(3.2));

  // Casing seams and cooked wrinkles.
  strokeCurve(ctx, palette.casingSeam, 0.55, 0.9 * s, mx(-18), my(2), mx(-7), my(9), mx(7), my(8));
  strokeCurve(ctx, palette.casingSeam, 0.35, 0.7 * s, mx(-14), my(-8), mx(0), my(-11), mx(15), my(-5));
  strokeCurve(ctx, palette.casingHighlight, 0.38, 0.8 * s, mx(-16), my(-5), mx(-8), my(-8), mx(2), my(-7));

  // Pale oat cutaway: one loud food cue, not a wound, snout, or freckles.
  fillTornCutaway(ctx, palette.casingSeam, 0.64, mx, my, 0, 0);
  fillTornCutaway(ctx, palette.crumbLight, 1, mx, my, 0.8, 0.45);
  strokeCurve(ctx, palette.casingSeam, 0.72, 0.9 * s, mx(-22.2), my(-5), mx(-18.9), my(-8.4), mx(-12.2), my(-6));
  strokeCurve(ctx, palette.casingHighlight, 0.42, 0.7 * s, mx(-20.7), my(1.2), mx(-15.8), my(2), mx(-12.6), my(-0.6));
  fillCircle(ctx, palette.crumbDark, 0.45, mx(-19.2), my(-4.7), 0.5 * s);
  fillCircle(ctx, palette.oatFleck, 0.95, mx(-18.8), my(-4.4), 0.95 * s);
  fillCircle(ctx, palette.oatFleck, 0.9, mx(-15.8), my(-2.2), 1.05 * s);
  fillCircle(ctx, palette.oatFleck, 0.82, mx(-12.8), my(-5.1), 0.85 * s);
  fillCircle(ctx, palette.crumbDark, 0.45, mx(-15.1), my(-1.0), 0.5 * s);

  // Oat flecks embedded in the casing.
  const flecks: readonly [number, number, number][] = [
    [-4, 8, 0.58],
    [10, 4, 0.62],
    [15, -3, 0.52],
    [6, -8, 0.48]
  ];
  for (const [fx, fy, fr] of flecks) {
    fillCircle(ctx, palette.oatFleck, 0.72, mx(fx), my(fy), fr * s);
  }

  // Big readable mascot eyes.
  fillCircle(ctx, palette.outline, 1, mx(-7.2), my(-2.2), 4.2 * s);
  fillCircle(ctx, palette.outline, 1, mx(8.3), my(-2.2), 4.2 * s);
  fillCircle(ctx, palette.eyeWhite, 1, mx(-7.2), my(-2.5), 3.4 * s);
  fillCircle(ctx, palette.eyeWhite, 1, mx(8.3), my(-2.5), 3.4 * s);
  fillCircle(ctx, palette.eyePupil, 1, mx(-5.8), my(-2.6), 1.45 * s);
  fillCircle(ctx, palette.eyePupil, 1, mx(9.7), my(-2.6), 1.45 * s);
  fillCircle(ctx, palette.eyeGlint, 0.92, mx(-6.1), my(-3.7), 0.6 * s);
  fillCircle(ctx, palette.eyeGlint, 0.92, mx(9.5), my(-3.7), 0.6 * s);
  strokeCurve(ctx, palette.outline, 0.32, 0.48 * s, mx(-10.4), my(-4.4), mx(-7.3), my(-5), mx(-3.8), my(-4.7));
  strokeCurve(ctx, palette.outline, 0.32, 0.48 * s, mx(4.1), my(-4.4), mx(8.4), my(-5), mx(11.9), my(-4.7));

  // Tiny content smile, low-contrast enough not to become a snout.
  strokeCurve(ctx, palette.mouth, 0.55, 0.8 * s, mx(-2.5), my(3.2), mx(0), my(4.8), mx(3.2), my(3.2));
}

// ── Canvas2D helpers ───────────────────────────────────────────────

function fillTornCutaway(
  ctx: BothyHaggisContext,
  color: string,
  alpha: number,
  mx: (dx: number) => number,
  my: (dy: number) => number,
  offsetX: number,
  offsetY: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(mx(-22.2 + offsetX), my(-5 + offsetY));
  ctx.quadraticCurveTo(mx(-18.9 + offsetX), my(-8.4 + offsetY), mx(-12.2 + offsetX), my(-6 + offsetY));
  ctx.quadraticCurveTo(mx(-10.8 + offsetX), my(-3.2 + offsetY), mx(-12.6 + offsetX), my(-0.6 + offsetY));
  ctx.quadraticCurveTo(mx(-15.2 + offsetX), my(2.2 + offsetY), mx(-20.7 + offsetX), my(1.2 + offsetY));
  ctx.quadraticCurveTo(mx(-23.4 + offsetX), my(-1.4 + offsetY), mx(-22.2 + offsetX), my(-5 + offsetY));
  ctx.fill();
  ctx.restore();
}

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

function strokeCurve(
  ctx: BothyHaggisContext, color: string, alpha: number, lineWidth: number,
  x0: number, y0: number, cpx: number, cpy: number, x1: number, y1: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cpx, cpy, x1, y1);
  ctx.stroke();
  ctx.restore();
}
