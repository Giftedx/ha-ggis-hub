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
  readonly tartanRed:   string;   // Stewart-ish red — primary tartan band
  readonly tartanGreen: string;   // BlackWatch-ish dark moss green
  readonly tartanCream: string;   // cream stripe between dark bands
  readonly tartanShadow: string;  // tartan cord shadow ring
  readonly thistlePurple: string; // thistle flower head
  readonly thistleStem:   string; // thistle stem + leaves
  readonly thistleHilite: string; // thistle bract highlight
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
  sackBase:       '#2a1810',
  sackMid:        '#6a4528',
  sackLit:        '#a06030',
  sackRim:        '#fff0c8',
  stitchInk:      '#1a0e08',
  tartanRed:      '#9c2018',
  tartanGreen:    '#1f4628',
  tartanCream:    '#f4d8a0',
  tartanShadow:   '#3a1410',
  thistlePurple:  '#7a4a9c',
  thistleStem:    '#3a5a30',
  thistleHilite:  '#c46abc',
  snoutDark:      '#1a0e08',
  snoutHint:      '#5a3220',
  mouthLine:      '#0a0604',
  eyeWhite:       '#f0e6c8',
  eyePupil:       '#0a0604',
  eyeCatch:       '#fff0c8',
  legDark:        '#1a0e08',
  heatherShadow:  '#28182c',
  heatherBloom:   '#7a4a9c'
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
  //    Four stubs at the bottom of the sack. ONE SIDE is dramatically
  //    shorter than the other (~3x difference) so the drift gag is
  //    actually visible at runtime scale, not a one-pixel offset.
  //    Drawn FIRST so the body sack covers the leg tops.
  const legW = 3.0 * s;
  const longH = 9 * s;
  const shortH = 3 * s;
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
  //    inside the body. Earlier versions drew 12 strokes in symmetric
  //    pairs — read as correction-tape. This pass uses fewer, more
  //    irregular strokes with varied length and direction so the
  //    surface feels hand-textured, not gridded.
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = palette.stitchInk;
  ctx.lineWidth = Math.max(1, 0.7 * s);
  const stitches: readonly [number, number, number, number][] = [
    // Irregular small wrinkles — varied length, varied angle, scattered
    // across the lower body. Top half kept clean for the face.
    [-13.5,  6,  -11.8,  8.3 ],
    [-10.2,  10, -9,    11.5 ],
    [ -5,   11.8,-3.6, 13   ],
    [  2.5, 12,   4.2, 13.5 ],
    [  9,   10.2, 10.5, 11.6],
    [ 13,   6.5, 14.2,  8   ],
    [-15,   1.5,-13.7,  3   ],
    [ 14,   2,   13,    3.6 ],
    [ -9.5, 14.5,-7.7, 16   ],
    [  9,   14.2, 7.4, 15.8 ],
    [ -2,   15.5,-0.5, 17.2 ]
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

  // Smile — wider, thicker, deeper than v1 so it actually reads at
  // runtime scale instead of looking like a beard-line. A clear
  // upturn arc with a small darker shadow below for warmth.
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = palette.mouthLine;
  ctx.lineWidth = Math.max(1.2, 1.1 * s);
  ctx.beginPath();
  ctx.moveTo(mx(-3.4), my(3.3));
  ctx.quadraticCurveTo(mx(0), my(5.2), mx(3.4), my(3.3));
  ctx.stroke();
  ctx.restore();
  // Tiny mouth-line shadow underneath to give the smile some warmth
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = palette.snoutHint;
  ctx.lineWidth = Math.max(0.8, 0.6 * s);
  ctx.beginPath();
  ctx.moveTo(mx(-2.8), my(4.3));
  ctx.quadraticCurveTo(mx(0), my(5.6), mx(2.8), my(4.3));
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
  // The "neck" pinch lives at design y ≈ -11 to -15. Above the tie sit
  // two small gathered-fabric flaps; the cinch itself is wrapped in
  // TARTAN cord (red+green+cream banded) — the load-bearing Highland
  // cultural tell. A tiny thistle is tucked at the front of the cinch.

  // Two fabric flaps — smaller and droopier than v1 (which read as
  // Pikachu ears). Tips angle outward and DOWN like wilted corners of
  // a tied cloth, not upward like animal ears.
  const wobble = tieWobble * 1.0;
  // Left flap — tip droops down-left
  ctx.save();
  ctx.fillStyle = palette.sackMid;
  ctx.beginPath();
  ctx.moveTo(mx(-4), my(-15));
  ctx.quadraticCurveTo(mx(-7 + wobble), my(-16.5), mx(-8.5 + wobble), my(-15));
  ctx.quadraticCurveTo(mx(-6 + wobble * 0.5), my(-14.5), mx(-3), my(-14.5));
  ctx.fill();
  ctx.restore();
  // Left flap shadow underside
  ctx.save();
  ctx.fillStyle = palette.sackBase;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(mx(-4), my(-14.7));
  ctx.quadraticCurveTo(mx(-6 + wobble * 0.5), my(-15.4), mx(-7.5 + wobble), my(-14.7));
  ctx.quadraticCurveTo(mx(-5 + wobble * 0.5), my(-14.3), mx(-3.5), my(-14.3));
  ctx.fill();
  ctx.restore();
  // Right flap — tip droops down-right
  ctx.save();
  ctx.fillStyle = palette.sackMid;
  ctx.beginPath();
  ctx.moveTo(mx(4), my(-15));
  ctx.quadraticCurveTo(mx(7 + wobble), my(-16.5), mx(8.5 + wobble), my(-15));
  ctx.quadraticCurveTo(mx(6 + wobble * 0.5), my(-14.5), mx(3), my(-14.5));
  ctx.fill();
  ctx.restore();
  // Right flap shadow underside
  ctx.save();
  ctx.fillStyle = palette.sackBase;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(mx(4), my(-14.7));
  ctx.quadraticCurveTo(mx(6 + wobble * 0.5), my(-15.4), mx(7.5 + wobble), my(-14.7));
  ctx.quadraticCurveTo(mx(5 + wobble * 0.5), my(-14.3), mx(3.5), my(-14.3));
  ctx.fill();
  ctx.restore();

  // TARTAN cord wraps — three horizontal bands across the cinch.
  // Each band is striped (cream → green → cream → red → cream → green
  // → cream) suggesting a plaid pattern. Bands are drawn back-to-front
  // so the lower wrap visually sits in front of the upper.
  const wraps: readonly { y: number; w: number; primary: 'red' | 'green' }[] = [
    { y: -12.8, w: 11, primary: 'red'   },
    { y: -11.5, w: 12, primary: 'green' },
    { y: -10.1, w: 13, primary: 'red'   }
  ];
  for (const wrap of wraps) {
    // Cord shadow ring (under the band, gives volume)
    fillEllipseRaw(ctx, palette.tartanShadow, 1, mx(0), my(wrap.y) + 0.5 * s, wrap.w * s, 1.1 * s);
    // Cord body — start with cream base, overlay tartan stripes
    fillEllipseRaw(ctx, palette.tartanCream, 1, mx(0), my(wrap.y), wrap.w * s, 0.9 * s);
    // Two darker stripes per band (red or green depending on band)
    const stripeColor = wrap.primary === 'red' ? palette.tartanRed : palette.tartanGreen;
    // Left stripe
    fillEllipseRaw(ctx, stripeColor, 0.95,
      mx(-wrap.w * 0.35), my(wrap.y), wrap.w * 0.18 * s, 0.85 * s);
    // Center stripe
    fillEllipseRaw(ctx, stripeColor, 0.95,
      mx(0), my(wrap.y), wrap.w * 0.18 * s, 0.85 * s);
    // Right stripe
    fillEllipseRaw(ctx, stripeColor, 0.95,
      mx(wrap.w * 0.35), my(wrap.y), wrap.w * 0.18 * s, 0.85 * s);
    // Thin cross-stripe of the OTHER colour (the over-under of plaid)
    const crossColor = wrap.primary === 'red' ? palette.tartanGreen : palette.tartanRed;
    fillEllipseRaw(ctx, crossColor, 0.55,
      mx(-wrap.w * 0.15), my(wrap.y), wrap.w * 0.06 * s, 0.85 * s);
    fillEllipseRaw(ctx, crossColor, 0.55,
      mx(wrap.w * 0.15), my(wrap.y), wrap.w * 0.06 * s, 0.85 * s);
  }

  // A small knot/cinch detail in the middle — two crossed cord
  // tails poking out either side of the wraps, in tartan red.
  ctx.save();
  ctx.strokeStyle = palette.tartanRed;
  ctx.lineWidth = Math.max(1, 0.7 * s);
  ctx.beginPath();
  ctx.moveTo(mx(-7), my(-11.5));
  ctx.quadraticCurveTo(mx(-9), my(-11), mx(-10), my(-10));
  ctx.moveTo(mx(7), my(-11.5));
  ctx.quadraticCurveTo(mx(9), my(-11), mx(10), my(-10));
  ctx.stroke();
  ctx.restore();

  // ── THISTLE sprig — tucked at the front of the cinch. A small
  //    purple bract topped with a pink fluffy crown + a green stem +
  //    two leaf hints. The iconic Scottish flower; rhymes visually
  //    with the heather patch under the haggis.
  // Stem (drawn first, behind the flower)
  ctx.save();
  ctx.strokeStyle = palette.thistleStem;
  ctx.lineWidth = Math.max(1, 0.7 * s);
  ctx.beginPath();
  ctx.moveTo(mx(4), my(-10));
  ctx.lineTo(mx(5), my(-12.5));
  ctx.stroke();
  ctx.restore();
  // Two tiny leaves on the stem
  fillEllipseRaw(ctx, palette.thistleStem, 1, mx(4.6), my(-11.2), 0.9 * s, 0.4 * s);
  fillEllipseRaw(ctx, palette.thistleStem, 0.85, mx(4.2), my(-10.5), 0.7 * s, 0.35 * s);
  // Bract — the spiky green base of the flower head (drawn as a small
  // diamond/triangle shape)
  ctx.save();
  ctx.fillStyle = palette.thistleStem;
  ctx.beginPath();
  ctx.moveTo(mx(4.2), my(-13));
  ctx.lineTo(mx(5), my(-13.8));
  ctx.lineTo(mx(5.8), my(-13));
  ctx.lineTo(mx(5), my(-12.4));
  ctx.fill();
  ctx.restore();
  // Flower head — purple fluffy crown above the bract. Drawn as a
  // small cluster of 3 overlapping circles for a soft pom-pom effect.
  fillCircle(ctx, palette.thistlePurple, 1, mx(5), my(-14.2), 1.1 * s);
  fillCircle(ctx, palette.thistlePurple, 1, mx(4.4), my(-14.4), 0.8 * s);
  fillCircle(ctx, palette.thistlePurple, 1, mx(5.6), my(-14.4), 0.8 * s);
  // Highlight wisp on top
  fillCircle(ctx, palette.thistleHilite, 0.8, mx(4.8), my(-14.7), 0.5 * s);
  // A couple of fine hair-strokes radiating off the flower head
  ctx.save();
  ctx.strokeStyle = palette.thistleHilite;
  ctx.lineWidth = Math.max(0.7, 0.4 * s);
  ctx.beginPath();
  ctx.moveTo(mx(5), my(-15.2));
  ctx.lineTo(mx(5.2), my(-15.8));
  ctx.moveTo(mx(4.4), my(-15.0));
  ctx.lineTo(mx(4.1), my(-15.6));
  ctx.moveTo(mx(5.6), my(-15.0));
  ctx.lineTo(mx(5.9), my(-15.6));
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
