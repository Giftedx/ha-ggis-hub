// Bothy haggis — the lobby inhabitant. Hub-original procedural drawer.
//
// Design language: TIED-OFF PUDDING WITH EYES. The wild haggis is a
// Scottish folk joke about the FOOD coming alive — the canonical shape
// is the dish itself: a stuffed sack tied at the top with twine, plus
// the running gag that one side's legs are shorter so it can only
// circle hills in one direction. Earlier drafts (smooth russet 3/4,
// og.svg silhouette, pixel sprite, WHS port, fluffy scallop "Furby")
// all drew a generic creature and lost the joke.
//
// This drawer commits to the food-shape:
//
//   - Pear/sack body — wider at the bottom, narrowing toward a cinched
//     "neck" at the top
//   - TIED TOP — three twine wraps + two upward "fabric ears" of the
//     gathered sack sticking up above the knot (the visual gag)
//   - Two big eyes peering from the upper-front of the sack
//   - Small dark muzzle + visible smile below
//   - FOUR leg stubs at the bottom; one side noticeably shorter than
//     the other — the canonical asymmetric drift
//   - Knobbly internal stitching strokes suggesting stuffing
//   - Peat-tan colour family like a cooked haggis
//
// AA-smooth Canvas2D, same register as bothy walls / hearth. Native
// scale 1 ≈ 50 wide × 50 tall (including tie + legs). Runtime scale
// 3 → ~150 wide presence. Front-facing — the sack reads the same in
// any direction, so `facingLeft` only affects which leg-pair is short.

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
  readonly sackBase:    string;   // body silhouette / outer dark
  readonly sackMid:     string;   // main warm peat-tan body
  readonly sackLit:     string;   // dawn-lit top-front body
  readonly sackRim:     string;   // dawn rim at the very top
  readonly stitchInk:   string;   // internal wrinkle/stitch strokes
  readonly twine:       string;   // oat-tan cord wrap
  readonly twineLit:    string;   // cord highlight catching dawn
  readonly twineDark:   string;   // cord shadow lines
  readonly snoutDark:   string;
  readonly snoutHint:   string;
  readonly mouthLine:   string;
  readonly eyeWhite:    string;
  readonly eyePupil:    string;
  readonly eyeCatch:    string;
  readonly legDark:     string;
  readonly heatherShadow: string;
  readonly heatherBloom:  string;
}

// Peat-tan palette tuned for the bothy: cooked-haggis warm browns
// dark enough to sit in the dim floor zone but warm enough to pick
// up the dawn beam when the haggis walks through it. The twine reads
// as a bright oat-cream against the body — the focal "this is a tied
// pudding" cue.
export const BOTHY_HAGGIS_PALETTE: BothyHaggisPalette = {
  sackBase:    '#2a1810',
  sackMid:     '#6a4528',
  sackLit:     '#a06030',
  sackRim:     '#fff0c8',
  stitchInk:   '#1a0e08',
  twine:       '#c4a878',
  twineLit:    '#f4d8a0',
  twineDark:   '#6a4a30',
  snoutDark:   '#1a0e08',
  snoutHint:   '#5a3220',
  mouthLine:   '#0a0604',
  eyeWhite:    '#f0e6c8',
  eyePupil:    '#0a0604',
  eyeCatch:    '#fff0c8',
  legDark:     '#1a0e08',
  heatherShadow: '#28182c',
  heatherBloom:  '#7a4a9c'
};

export interface BothyHaggisFrame {
  readonly breathY?: number;
  /** Mirrors the asymmetric-leg drift (short side flips L↔R). The body
   *  itself is front-facing so the sack silhouette is unchanged. */
  readonly facingLeft?: boolean;
  /** Lift applied to whichever leg pair is currently in the "up" half
   *  of the walk cycle. The drawer assigns this to the long pair. */
  readonly frontLegY?: number;
  readonly backLegY?: number;
  /** Wobble applied to the upward "fabric ears" above the tied neck. */
  readonly tieWobble?: number;
  /** 1 = eyes fully open, 0 = closed. */
  readonly blink?: number;
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
  const legALift = (frame.frontLegY ?? 0) * s;
  const legBLift = (frame.backLegY ?? 0) * s;
  const dir = frame.facingLeft === true ? -1 : 1;
  const blink = frame.blink ?? 1;
  const tieWobble = (frame.tieWobble ?? 0) * dir;

  // mx/my map design coords into canvas coords. Note: the sack silhouette
  // is left/right symmetric, so `dir` is only used to mirror the drift
  // (short legs swap sides) and the tie wobble.
  const mx = (dx: number): number => cx + dx * s;  // sack body — NO mirror
  const my = (dy: number): number => cy + dy * s + breathY;
  // ax mirrors only for asymmetric features (legs, tie wobble).
  const ax = (dx: number): number => cx + dx * dir * s;

  // ── Heather-purple ground patch ────────────────────────────────
  fillEllipseRaw(ctx, palette.heatherShadow, 0.6, cx, my(20), 36 * s, 4 * s);
  fillCircle(ctx, palette.heatherBloom, 0.7, mx(-12), my(20.5), 1.2 * s);
  fillCircle(ctx, palette.heatherBloom, 0.6, mx(5),   my(21),   1.0 * s);

  // ── ASYMMETRIC LEGS — the canonical drift gag.
  //    Four stubs at the bottom of the sack. ONE SIDE is noticeably
  //    shorter than the other (≈40% height difference) so the haggis
  //    visibly leans to one side. The short side flips with facingLeft
  //    so the "uphill" foot points the way the haggis is heading.
  //    Drawn FIRST so the body sack covers the leg tops.
  const legW = 3.0 * s;
  const longH = 7 * s;
  const shortH = 4 * s;
  const legBaseY = my(15);
  // dir = +1: short side is on the LEFT (ax<0); dir = -1: short side flips
  // to ax>0. ax already handles the mirror so we can index by design x.
  const legs: readonly { x: number; long: boolean; lift: number }[] = [
    { x: -10, long: true,  lift: legALift },   // far-left
    { x:  -4, long: true,  lift: legBLift },   // mid-left
    { x:   4, long: false, lift: legALift },   // mid-right (short)
    { x:  10, long: false, lift: legBLift }    // far-right  (short)
  ];
  for (const leg of legs) {
    const lx = ax(leg.x);
    const h = leg.long ? longH : shortH;
    fillRect(ctx, palette.legDark, 1, lx - legW / 2, legBaseY + leg.lift, legW, h);
    // Hoof bar — slightly wider, darker
    fillRect(ctx, palette.stitchInk, 1, lx - legW / 2 - 0.5, legBaseY + leg.lift + h - 1.4 * s, legW + 1, 1.4 * s);
  }

  // ── BODY SACK — pear/teardrop, drawn as a closed quadratic path
  //    that's wider at the bottom and narrows toward the tied neck.
  //    Done as one big shape (not a stack of ellipses) so the
  //    silhouette is intentional, not "stuck-together blobs".
  drawSackBody(ctx, palette, mx, my, s);

  // ── Dawn-lit upper crown — a translucent warm crescent only on the
  //    very top of the sack, ABOVE the face zone. Earlier drafts had
  //    this ellipse sit over the eye zone and wash the face into a
  //    white mask; restricting it to the crown keeps the focal
  //    contrast on the eyes.
  fillEllipseRaw(ctx, palette.sackLit, 0.5, mx(-2), my(-8), 14 * s, 4.5 * s);
  fillEllipseRaw(ctx, palette.sackLit, 0.35, mx(2), my(-6), 10 * s, 3 * s);

  // ── Knobbly stuffing texture — short dark stitch strokes scattered
  //    inside the body. Suggests the bulges of stuffing pushing
  //    against the cloth. Anchored deterministically; visibility
  //    bumped over v1 so the surface actually reads as stuffed.
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = palette.stitchInk;
  ctx.lineWidth = Math.max(1, 0.75 * s);
  const stitches: readonly [number, number, number, number][] = [
    // [x1, y1, x2, y2] — short ticks suggesting the cloth bulging.
    // Placed on the lower-body curves where the stuffing would push
    // most visibly against the sack. Top half kept clean for the face.
    [-14,  5, -12,  7 ],
    [-10,  9,  -8, 11 ],
    [ -5, 11,  -3, 13 ],
    [  3, 11,   5, 13 ],
    [  8,  9,  10, 11 ],
    [ 12,  5,  14,  7 ],
    [-14,  0, -13,  2 ],
    [ 13,  0,  14,  2 ],
    [-10, 14,  -8, 16 ],
    [  8, 14,  10, 16 ],
    [ -3, 15,  -1, 17 ],
    [  1, 15,   3, 17 ]
  ];
  for (const [x1, y1, x2, y2] of stitches) {
    ctx.beginPath();
    ctx.moveTo(mx(x1), my(y1));
    ctx.lineTo(mx(x2), my(y2));
    ctx.stroke();
  }
  ctx.restore();

  // ── Belly shadow — a soft darker patch on the lower half of the
  //    sack. Adds 3D form without painting a hard bicolor line.
  fillEllipseRaw(ctx, palette.sackBase, 0.32, mx(0), my(10), 20 * s, 5 * s);

  // ── TIED NECK — three twine wraps at the cinch point + two upward
  //    "fabric ears" above the tie. THIS is the visual gag that says
  //    "I am a haggis, the food". Drawn AFTER body so it sits on top.
  drawTiedNeck(ctx, palette, mx, my, s, tieWobble);

  // ── FACE — eyes, muzzle, smile. Positioned on the upper-front
  //    quadrant of the sack (cy ≈ -4 to +5).

  // Face zone is implied by the muzzle bulge; no separate dark patch.

  // Muzzle bulge — gives the lower face a clear "snout" form
  fillEllipseRaw(ctx, palette.snoutHint, 0.9, mx(0), my(2.5), 6.4 * s, 4.2 * s);
  // Nose — small dark mass on top of the muzzle bulge
  fillEllipseRaw(ctx, palette.snoutDark, 1, mx(0), my(1.6), 3.0 * s, 1.8 * s);
  // Nose lit highlight
  fillCircle(ctx, palette.snoutHint, 0.8, mx(-0.4), my(1.2), 0.5 * s);
  // Two nostril dots on the nose
  fillCircle(ctx, palette.mouthLine, 0.85, mx(-0.9), my(1.9), 0.35 * s);
  fillCircle(ctx, palette.mouthLine, 0.85, mx(0.9), my(1.9), 0.35 * s);

  // Smile — sits BELOW the nose but well above the lower jaw. A wide
  // shallow upturn so it reads as a content half-smile at distance.
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = palette.mouthLine;
  ctx.lineWidth = Math.max(1, 0.8 * s);
  ctx.beginPath();
  ctx.moveTo(mx(-2.4), my(3.6));
  ctx.quadraticCurveTo(mx(0), my(4.8), mx(2.4), my(3.6));
  ctx.stroke();
  ctx.restore();

  // Eyes — wide apart on upper face, sit ABOVE the snout. Slight
  // asymmetry between the two (right eye is 0.2 units larger with a
  // catchlight at a slightly different angle) so the face reads as
  // hand-drawn rather than CAD-symmetric.
  drawEye(ctx, palette, mx(-5.5), my(-1.2), 2.4 * s, 1.2 * s, blink, -0.3);
  drawEye(ctx, palette, mx( 5.7), my(-1),   2.6 * s, 1.3 * s, blink,  0.1);
}

// ── Body sack — closed quadratic-bezier pear path ──────────────────

function drawSackBody(
  ctx: BothyHaggisContext,
  palette: BothyHaggisPalette,
  mx: (dx: number) => number,
  my: (dy: number) => number,
  s: number
): void {
  // The sack silhouette is a teardrop: wide at the bottom, narrowing
  // toward the tied neck. Defined as a closed quadratic path so the
  // top "neck" pinch is intentional, not an accident of stacked ellipses.

  // Outer dark silhouette ring (drawn first, slightly larger). The
  // path is intentionally pear-shaped: narrow cinched neck at top,
  // shoulders kept tight, body widening into a heavy hip around y=6,
  // then rounding back into a softer bottom. That asymmetry is what
  // sells "stuffed bag" instead of "egg".
  ctx.save();
  ctx.fillStyle = palette.sackBase;
  ctx.beginPath();
  ctx.moveTo(mx(-5), my(-12));
  // up over the cinch on the left
  ctx.quadraticCurveTo(mx(-6), my(-14.5), mx(-4), my(-15));
  // across the top of the cinch
  ctx.quadraticCurveTo(mx(0), my(-15.5), mx(4), my(-15));
  // down over the cinch on the right
  ctx.quadraticCurveTo(mx(6), my(-14.5), mx(5), my(-12));
  // narrow shoulder bulge
  ctx.quadraticCurveTo(mx(11), my(-9), mx(15), my(-3));
  // dramatic widening into the hip
  ctx.quadraticCurveTo(mx(21), my(6), mx(18), my(14));
  // rounded bottom
  ctx.quadraticCurveTo(mx(11), my(19.5), mx(0), my(19.5));
  ctx.quadraticCurveTo(mx(-11), my(19.5), mx(-18), my(14));
  // back up the left hip + shoulder
  ctx.quadraticCurveTo(mx(-21), my(6), mx(-15), my(-3));
  ctx.quadraticCurveTo(mx(-11), my(-9), mx(-5), my(-12));
  ctx.fill();
  ctx.restore();

  // Inner main body — same shape pulled in 1.2-1.5 units, peat-tan fill
  ctx.save();
  ctx.fillStyle = palette.sackMid;
  ctx.beginPath();
  ctx.moveTo(mx(-4), my(-11));
  ctx.quadraticCurveTo(mx(-5), my(-13.5), mx(-3), my(-14));
  ctx.quadraticCurveTo(mx(0), my(-14.5), mx(3), my(-14));
  ctx.quadraticCurveTo(mx(5), my(-13.5), mx(4), my(-11));
  ctx.quadraticCurveTo(mx(9.5), my(-8), mx(13.5), my(-3));
  ctx.quadraticCurveTo(mx(19), my(6), mx(16.5), my(13));
  ctx.quadraticCurveTo(mx(10), my(18), mx(0), my(18));
  ctx.quadraticCurveTo(mx(-10), my(18), mx(-16.5), my(13));
  ctx.quadraticCurveTo(mx(-19), my(6), mx(-13.5), my(-3));
  ctx.quadraticCurveTo(mx(-9.5), my(-8), mx(-4), my(-11));
  ctx.fill();
  ctx.restore();

  // Dawn rim — thin warm crescent along the upper-front of the sack
  // (the top curve where the body widens from the cinch).
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = palette.sackRim;
  ctx.beginPath();
  ctx.moveTo(mx(-13), my(-9.5));
  ctx.quadraticCurveTo(mx(0), my(-14.5), mx(13), my(-9.5));
  ctx.quadraticCurveTo(mx(0), my(-12.5), mx(-13), my(-9.5));
  ctx.fill();
  ctx.restore();
  // Stronger highlight pop at the very top of the curve
  fillEllipseRaw(ctx, palette.sackRim, 0.55, mx(0), my(-13), 8 * s, 1.6 * s);

  // Silence unused-var lint (we pass s through helpers above)
  void s;
}

// ── Tied neck — twine + fabric ears ────────────────────────────────

function drawTiedNeck(
  ctx: BothyHaggisContext,
  palette: BothyHaggisPalette,
  mx: (dx: number) => number,
  my: (dy: number) => number,
  s: number,
  tieWobble: number
): void {
  // The "neck" pinch lives at design y ≈ -12 to -16. Above the tie we
  // draw two upward gathered-fabric "ears" — that's the iconic gift-
  // wrapped-pudding cue. The cord wraps three times around the cinch.

  // Two fabric "ears" — the gathered cloth above the cinch. They flop
  // OUTWARD (not vertically — those read as rabbit ears) and droop
  // slightly, like the bunched corners of a tied present. tieWobble
  // sways the tips against the body's motion.
  const wobble = tieWobble * 1.2;
  // Left ear — root on the cinch, tip flops up-and-LEFT, drops back in
  ctx.save();
  ctx.fillStyle = palette.sackMid;
  ctx.beginPath();
  ctx.moveTo(mx(-4.5), my(-15.5));
  ctx.quadraticCurveTo(mx(-10 + wobble), my(-19), mx(-12 + wobble), my(-17));
  ctx.quadraticCurveTo(mx(-9 + wobble * 0.5), my(-15.5), mx(-3), my(-15));
  ctx.fill();
  ctx.restore();
  // Left ear shadow underside
  ctx.save();
  ctx.fillStyle = palette.sackBase;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(mx(-5), my(-15));
  ctx.quadraticCurveTo(mx(-9 + wobble * 0.5), my(-16.5), mx(-11 + wobble), my(-15.5));
  ctx.quadraticCurveTo(mx(-9 + wobble * 0.5), my(-14.7), mx(-4.5), my(-14.5));
  ctx.fill();
  ctx.restore();
  // Right ear — flops up-and-RIGHT
  ctx.save();
  ctx.fillStyle = palette.sackMid;
  ctx.beginPath();
  ctx.moveTo(mx(4.5), my(-15.5));
  ctx.quadraticCurveTo(mx(10 + wobble), my(-19), mx(12 + wobble), my(-17));
  ctx.quadraticCurveTo(mx(9 + wobble * 0.5), my(-15.5), mx(3), my(-15));
  ctx.fill();
  ctx.restore();
  // Right ear shadow underside
  ctx.save();
  ctx.fillStyle = palette.sackBase;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(mx(5), my(-15));
  ctx.quadraticCurveTo(mx(9 + wobble * 0.5), my(-16.5), mx(11 + wobble), my(-15.5));
  ctx.quadraticCurveTo(mx(9 + wobble * 0.5), my(-14.7), mx(4.5), my(-14.5));
  ctx.fill();
  ctx.restore();

  // Twine wraps — three horizontal cords across the cinch. The
  // middle wrap is the widest (top of the bulge); the outer two
  // narrow to suggest the cord meeting itself around the bunch.
  // Drawn from back to front: dark shadow, cord body, lit highlight.
  const wraps: readonly { y: number; w: number }[] = [
    { y: -13.5, w: 11 },
    { y: -12.2, w: 12 },
    { y: -10.8, w: 13 }
  ];
  for (const wrap of wraps) {
    // Cord shadow rim
    fillEllipseRaw(ctx, palette.twineDark, 1, mx(0), my(wrap.y) + 0.5 * s, wrap.w * s, 1.1 * s);
    // Cord body
    fillEllipseRaw(ctx, palette.twine, 1, mx(0), my(wrap.y), wrap.w * s, 0.9 * s);
    // Cord highlight
    fillEllipseRaw(ctx, palette.twineLit, 0.7, mx(-wrap.w * 0.25), my(wrap.y) - 0.25 * s, wrap.w * 0.5 * s, 0.4 * s);
  }

  // A small knot/cinch detail in the middle — two crossed twine
  // tails poking out either side of the wraps.
  ctx.save();
  ctx.strokeStyle = palette.twineDark;
  ctx.lineWidth = Math.max(1, 0.7 * s);
  ctx.beginPath();
  ctx.moveTo(mx(-7), my(-12.5));
  ctx.quadraticCurveTo(mx(-9), my(-12), mx(-10), my(-11));
  ctx.moveTo(mx(7), my(-12.5));
  ctx.quadraticCurveTo(mx(9), my(-12), mx(10), my(-11));
  ctx.stroke();
  ctx.restore();
}

// ── Eye drawer ─────────────────────────────────────────────────────

function drawEye(
  ctx: BothyHaggisContext,
  palette: BothyHaggisPalette,
  ex: number, ey: number,
  rOuter: number, rPupil: number,
  blink: number,
  catchOffset: number  // -1..1; shifts catchlight x-offset from centre
): void {
  // Dark socket
  fillCircle(ctx, palette.stitchInk, 1, ex, ey, rOuter + 0.6);
  if (blink <= 0.05) {
    // Closed — horizontal slit
    ctx.save();
    ctx.fillStyle = palette.stitchInk;
    ctx.fillRect(ex - rOuter, ey - 0.5, rOuter * 2, 1);
    ctx.restore();
    return;
  }
  const ryWhite = rOuter * blink;
  fillEllipseRaw(ctx, palette.eyeWhite, 1, ex, ey, rOuter, ryWhite);
  if (blink > 0.5) {
    fillCircle(ctx, palette.eyePupil, 1, ex, ey, rPupil);
    // Catchlight — small crescent shifted by catchOffset so the two
    // eyes don't have mirror-perfect highlights.
    fillEllipseRaw(ctx, palette.eyeCatch, 1,
      ex + rPupil * catchOffset, ey - rPupil * 0.55,
      rPupil * 0.55, rPupil * 0.35);
  }
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
