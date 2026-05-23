// Hub Dawn Bothy — value plan + palette single source of truth.
//
// Every sprite and procedural draw in the scene MUST source its colours
// from here. The reviewer's diagnosis was that the previous output had
// "no value plan, no light/mid/dark hierarchy" — total value range was
// ~30% and everything muddied into mid-brown. This module enforces a
// three-zone value structure:
//
//   ZONE A — DAWN POOL: warm + high value. Where the window beam falls.
//            Saturated peach, neeps-gold, warm bone.
//   ZONE B — DAWN EDGE: warm + mid value. Beam halo / spill light.
//            Soft peach + warm tan.
//   ZONE C — SHADOW:    cool + low value. Away from the beam.
//            Heather-shadow purples, peat-cool browns, ink.
//
// The DAWN POOL is the room's brightest, highest-saturation zone. The
// SHADOW is the room's darkest, coolest zone. Everything in between
// uses the EDGE palette. This creates the dramatic value range the
// reviewer said was missing.

// =============================================================
// PALETTE
// =============================================================

// =============================================================
// NEW DISCIPLINED PALETTE — per pixel-art plan §"Palette: consolidate
// to 16 colours with hue shift"
// =============================================================
//
// Four 4-tone ramps. Each ramp shifts HUE across the value range
// (not just value): shadows shift toward red-purple or blue-purple
// (cool dark), highlights shift toward yellow (warm light). This is
// the discipline pro pixel art uses; the old single-hue ramps read
// as muddy. 16 colours total.

export const RAMPS = {
  // WARM WOOD ramp — bothy floor + furniture wood. Shadow shifts to
  // red-violet, highlight shifts to yellow-cream.
  woodDeep:    '#1a0e1a',   // deep red-violet (shadow base)
  woodDark:    '#3a1e18',   // warm red-brown
  woodMid:     '#7a4628',   // warm wood mid
  woodLit:     '#d8a85a',   // yellow-shifted warm highlight

  // COOL STONE ramp — bothy walls. Shadow shifts blue-purple, highlight
  // shifts cream.
  stoneDeep:   '#181828',   // deep blue-violet (shadow)
  stoneDark:   '#3a3848',   // purple-grey
  stoneMid:    '#9a8a78',   // warm tan mid
  stoneLit:    '#e8d0a0',   // cream highlight

  // HAGGIS FUR ramp — protagonist. Hue-shifted ginger going to blonde.
  hagDeep:     '#2a1410',   // deep red-brown
  hagDark:     '#5a3018',   // dark ginger
  hagMid:      '#a86a30',   // ginger
  hagLit:      '#f0c878',   // bright blonde tip

  // EMBER/ACCENT ramp — hearth glow, dawn highlights. Saturated warm.
  emberDeep:   '#4a1408',   // deep red
  emberMid:    '#c44218',   // bright orange-red
  emberHot:    '#ffb028',   // warm yellow-orange
  emberCore:   '#fff0c8'    // near-white core
} as const;

// Legacy PALETTE — kept for the existing renderer code paths during
// the migration; new code should use RAMPS only. To be deleted once
// all references are migrated.
export const PALETTE = {
  // --- DAWN POOL (warm + light, inside the beam) ---
  dawnHighlight:    '#fff0c8',  // brightest, near the window source
  dawnGold:         '#ffd078',  // warm sun gold
  dawnPeach:        '#f4b078',  // peach (most-saturated mid)
  dawnCream:        '#f0d8a0',  // cream-tan for plaster/wood in light
  litWoodHi:        '#a07050',  // wood plank lit, top edge
  litWoodMid:       '#7a4a28',  // wood plank lit, body
  litStoneHi:       '#e0c090',  // stone lit, top edge
  litStoneMid:      '#b89060',  // stone lit, body
  litStoneShadow:   '#6a4828',  // stone lit, shadow side

  // --- DAWN EDGE (warm + mid, beam halo / spill) ---
  edgePink:         '#f4c8b8',  // dawn pink spill
  edgeTan:          '#c8a878',  // warm tan
  edgeBrown:        '#8a6038',  // mid ginger / mid wood

  // --- SHADOW (cool + dark, away from beam) ---
  // Pushed ~30% darker after reviewer: "value range too narrow — nothing
  // is near-black, nothing is near-white". The shadow side now actually
  // drops toward black so the dawn pool reads as truly bright by contrast.
  shadowCool:       '#1a1422',  // peat-cool brown-violet (floor away from light)
  shadowDeep:       '#0a0408',  // deepest ink shadow (near-black)
  shadowStoneMid:   '#3a3036',  // stone in shadow, cool
  shadowStoneDark:  '#1f1818',  // stone in shadow, deep
  shadowStoneHi:    '#5a4848',  // stone in shadow, top edge (still cool, dimmer)
  shadowWoodMid:    '#1f1410',  // wood in shadow
  shadowWoodHi:     '#3a2218',  // wood in shadow, top edge
  shadowHeather:    '#28182c',  // heather-purple shadow accent

  // --- NEUTRAL / FOCAL ---
  ink:              '#1a0e08',  // pure outline ink
  bone:             '#f0e6c8',  // tatties-cream (text, paper)
  haggisHairLit:    '#c8a058',  // ginger mane in light
  haggisHairMid:    '#8a6038',  // ginger mane mid
  haggisFaceDark:   '#2a1408',  // dark face skin
  haggisNose:       '#a44030',  // dusty rose nose
  emberHot:         '#fff0a8',  // ember white-hot core
  emberBright:      '#ffc060',  // ember bright glow
  emberDim:         '#c44218',  // ember dim red
  whisky:           '#c8842a',  // brass / whisky highlight
  brassDark:        '#7a5018'   // brass shadow
} as const;

// =============================================================
// LIGHT ZONE CLASSIFICATION
// =============================================================

// Beam geometry — single source of truth. Used by:
//   1. Floor light-baking (which planks are lit)
//   2. Sprite placement (which sprites use lit vs shadow variants)
//   3. Anything that needs to know "is this pixel in the dawn?"
//
// Coordinates are in surface (canvas) space. The beam originates from
// the centre of the back wall (window) and fans down into the floor.

export interface BeamGeometry {
  readonly cx: number;          // centre x of beam (window centre)
  readonly topY: number;        // y where beam emerges (window sill)
  readonly length: number;      // beam depth
  readonly topHalfWidth: number;
  readonly bottomHalfWidth: number;
}

export function makeBeamGeometry(
  surfaceWidth: number,
  surfaceHeight: number,
  backWallThick: number
): BeamGeometry {
  return {
    cx: Math.round(surfaceWidth / 2),
    topY: backWallThick + 1,
    length: Math.round(surfaceHeight * 0.55),
    topHalfWidth: 36,
    bottomHalfWidth: 110
  };
}

export type LightZone = 'pool' | 'edge' | 'shadow';

// Classify a pixel by which lighting zone it falls in. Used to pick
// the right palette variant for that pixel.
export function lightZoneAt(x: number, y: number, beam: BeamGeometry): LightZone {
  if (y < beam.topY || y > beam.topY + beam.length) return 'shadow';
  const t = (y - beam.topY) / beam.length;
  const dx = Math.abs(x - beam.cx);
  const innerHalf = beam.topHalfWidth + (beam.bottomHalfWidth - beam.topHalfWidth) * t;
  const outerHalf = innerHalf + 18;
  if (dx <= innerHalf) return 'pool';
  if (dx <= outerHalf) return 'edge';
  return 'shadow';
}

// =============================================================
// HARD-PIXEL EFFECTS — per rendering rulebook (rules.md §1, §3)
// =============================================================
// Every alpha-blended `arc/fillStyle/globalAlpha` ring pattern in the
// scene gets replaced with these. They use ordered dither + hard
// integer-pixel placement so the effect stays pixel-honest.

export interface HardPixelContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, width: number, height: number): void;
}

// 4×4 Bayer ordered-dither matrix. Threshold 0..15. Cells with threshold
// LESS than the chosen value get painted. Used to fake soft alphas with
// hard pixels.
const BAYER_4X4: ReadonlyArray<ReadonlyArray<number>> = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

// Dithered radial bloom: paints `colour` over a disc of `radius` around
// (cx, cy) using the Bayer matrix to pick which pixels get painted,
// based on each pixel's distance from centre. No alpha tricks — every
// painted pixel is fully opaque.
//
// `density` 0..1 scales the overall coverage (1 = full disc filled; 0 =
// nothing). Falloff is automatic: pixels near the edge use a higher
// Bayer threshold so only a few cells qualify.
export function ditheredBloom(
  ctx: HardPixelContext,
  cx: number,
  cy: number,
  radius: number,
  colour: string,
  density: number
): void {
  ctx.fillStyle = colour;
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const t = d2 / r2;
      const threshold = Math.round(t * 15 + (1 - density) * 6);
      const bayerVal = BAYER_4X4[((cy + dy) & 3)]![((cx + dx) & 3)]!;
      if (bayerVal < 15 - threshold) {
        ctx.fillRect(cx + dx, cy + dy, 1, 1);
      }
    }
  }
}

// Asymmetric dithered bloom — biased toward (toBiasX, toBiasY).
//
// `yStretch`: defaults to 1 (round bloom). >1 means light spills
// further vertically (along plank grain in a top-down floor view) than
// horizontally — produces an axis-aligned cross-ish shape that reads
// as "light along the floorboards" not "round blob".
export function ditheredBloomBiased(
  ctx: HardPixelContext,
  cx: number,
  cy: number,
  radius: number,
  biasX: number,
  biasY: number,
  colour: string,
  density: number,
  yStretch: number = 1
): void {
  ctx.fillStyle = colour;
  const r2 = radius * radius;
  const blen = Math.sqrt(biasX * biasX + biasY * biasY) || 1;
  const bx = biasX / blen;
  const by = biasY / blen;
  // Inner ring boundary (in t = d2/r2 units): inside this, paint as 1×1.
  // Outside this, paint as 2×2 clusters (sparse but chunky).
  const innerRingT = 0.45;
  // Step through pixels at appropriate stride — 2 for the outer ring,
  // 1 for the inner core.
  // Effective dy is divided by yStretch so vertical distance "feels"
  // smaller — light reaches further along the Y axis.
  const yStretchInv = 1 / Math.max(0.1, yStretch);
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const dyEff = dy * yStretchInv;
      const d2 = dx * dx + dyEff * dyEff;
      if (d2 > r2) continue;
      const t = d2 / r2;
      const pixLen = Math.sqrt(d2) || 1;
      const dot = (dx / pixLen) * bx + (dyEff / pixLen) * by;
      const sideShift = -dot * 8;
      const isOuter = t > innerRingT;
      // For outer ring, sample on a 2-pixel grid so 2×2 clusters don't
      // overlap. Skip non-anchor cells.
      if (isOuter && ((cx + dx) & 1) !== 0) continue;
      if (isOuter && ((cy + dy) & 1) !== 0) continue;
      const threshold = Math.round(t * 15 + (1 - density) * 6 + sideShift);
      if (threshold >= 15) continue;
      const bayerVal = BAYER_4X4[((cy + dy) & 3)]![((cx + dx) & 3)]!;
      if (bayerVal < 15 - threshold) {
        if (isOuter) {
          // 2×2 cluster — but skip ~15% of clusters deterministically
          // to break the perfect-oval shape (reviewer's note about
          // bloom looking too regular / decal-like).
          const hash = ((cx + dx) * 1103 + (cy + dy) * 769) & 0x3ff;
          if (hash % 7 === 0) continue;
          ctx.fillRect(cx + dx, cy + dy, 2, 2);
        } else {
          ctx.fillRect(cx + dx, cy + dy, 1, 1);
        }
      }
    }
  }
}

// PROPER ORDERED-DITHER approach (replaces geometric ditheredBloomBiased
// per reviewer's note: 'use a radial gradient mask before dither, not
// geometric falloff'). The smoothness comes from the alpha function
// (any shape — circle, ellipse, irregular); the dither converts the
// continuous alpha to hard pixels via Bayer thresholding.
//
// alphaFn(dx, dy) returns 0..1. 0 = no paint; 1 = always paint;
// intermediate values produce dithered density at that level.
//
// The 2×2-cluster trick at low alpha is preserved (avoids lone-pixel
// JPEG-crumb noise the reviewer flagged earlier).
export function ditheredAlphaMask(
  ctx: HardPixelContext,
  cx: number,
  cy: number,
  bbox: { halfW: number; halfH: number },
  colour: string,
  alphaFn: (dx: number, dy: number) => number
): void {
  ctx.fillStyle = colour;
  for (let dy = -bbox.halfH; dy <= bbox.halfH; dy += 1) {
    for (let dx = -bbox.halfW; dx <= bbox.halfW; dx += 1) {
      const alpha = alphaFn(dx, dy);
      if (alpha <= 0) continue;
      const cell = BAYER_4X4[((cy + dy) & 3)]![((cx + dx) & 3)]!;
      // Cell is 0..15 — paint if cell < alpha*16.
      if (cell < alpha * 16) {
        // At very low alpha, cluster into 2×2 blocks to avoid lone-pixel
        // noise (reviewer's earlier feedback). Use a coarse 2×2 grid
        // anchor so blocks don't overlap.
        if (alpha < 0.35) {
          if (((cx + dx) & 1) !== 0) continue;
          if (((cy + dy) & 1) !== 0) continue;
          // Skip ~14% deterministically for natural irregularity
          const hash = ((cx + dx) * 1103 + (cy + dy) * 769) & 0x3ff;
          if (hash % 7 === 0) continue;
          ctx.fillRect(cx + dx, cy + dy, 2, 2);
        } else {
          ctx.fillRect(cx + dx, cy + dy, 1, 1);
        }
      }
    }
  }
}

// Smooth radial alpha curve — produces a soft ellipse mask with
// directional bias. Use as the alphaFn argument to ditheredAlphaMask.
//
// Falloff: plateau-then-smoothstep. Alpha = 1 for t < plateauEnd, then
// smoothstep down to 0 by t = 1. Previously used vanilla Hermite which
// kept too many pixels in the 0.15-0.45 alpha range — that produced a
// huge speckled "halo annulus" reading as film grain not light.
// plateauEnd = 0.35 means the inner 35% of radius is fully lit, the
// outer 65% is the transition band.
export function radialEllipseAlpha(
  radius: number,
  yStretch: number,
  biasX: number,
  biasY: number,
  biasStrength: number,
  plateauEnd: number = 0.35
): (dx: number, dy: number) => number {
  const blen = Math.sqrt(biasX * biasX + biasY * biasY) || 1;
  const bx = biasX / blen;
  const by = biasY / blen;
  const yStretchInv = 1 / Math.max(0.1, yStretch);
  const plateau = Math.max(0, Math.min(0.9, plateauEnd));
  const transitionLen = 1 - plateau;
  return (dx, dy) => {
    const dyEff = dy * yStretchInv;
    const d = Math.sqrt(dx * dx + dyEff * dyEff);
    if (d > radius) return 0;
    const t = d / radius;
    let base: number;
    if (t < plateau) {
      base = 1;
    } else {
      // Smoothstep from plateau-end (alpha=1) to radius (alpha=0)
      const tt = (t - plateau) / transitionLen;
      base = 1 - (3 * tt * tt - 2 * tt * tt * tt);
    }
    const pixLen = d || 1;
    const dot = (dx / pixLen) * bx + (dyEff / pixLen) * by;
    return Math.max(0, Math.min(1, base + dot * biasStrength * (1 - t)));
  };
}

// Two-step ordered dither across a rectangular zone — paints
// `colourLight` and `colourDark` in a 50/50 Bayer pattern to create an
// "internal texture" inside a flat zone fill. Used inside the dawn pool
// body so it doesn't read as flat paint.
export function ditherZoneInternal(
  ctx: HardPixelContext,
  bbox: { x: number; y: number; w: number; h: number },
  predicate: (x: number, y: number) => boolean,
  colourLight: string,
  colourDark: string,
  threshold: number
): void {
  for (let yy = bbox.y; yy < bbox.y + bbox.h; yy += 1) {
    for (let xx = bbox.x; xx < bbox.x + bbox.w; xx += 1) {
      if (!predicate(xx, yy)) continue;
      const bayerVal = BAYER_4X4[(yy & 3)]![(xx & 3)]!;
      ctx.fillStyle = bayerVal < threshold ? colourLight : colourDark;
      ctx.fillRect(xx, yy, 1, 1);
    }
  }
}

// Dithered hard-edge band along the boundary between two zones. Used to
// break the razor edge of the dawn pool / shadow boundary on the floor.
// Walks along the boundary trapezoid and paints `colour` in dithered
// cells just OUTSIDE the boundary so the eye sees soft transition.
export function ditherBoundary(
  ctx: HardPixelContext,
  pointsAlongBoundary: ReadonlyArray<readonly [number, number]>,
  thickness: number,
  colour: string,
  density: number
): void {
  ctx.fillStyle = colour;
  for (const [px, py] of pointsAlongBoundary) {
    for (let dy = -thickness; dy <= thickness; dy += 1) {
      for (let dx = -thickness; dx <= thickness; dx += 1) {
        const d2 = dx * dx + dy * dy;
        if (d2 > thickness * thickness) continue;
        const t = Math.sqrt(d2) / thickness;
        const threshold = Math.round(t * 15 + (1 - density) * 5);
        const bayerVal = BAYER_4X4[((py + dy) & 3)]![((px + dx) & 3)]!;
        if (bayerVal < 15 - threshold) {
          ctx.fillRect(px + dx, py + dy, 1, 1);
        }
      }
    }
  }
}

// Hard-pixel elliptical contact shadow. Single fixed alpha (40%) — no
// nested shrinking ellipses with decreasing alpha. Per rules.md §3.
export function hardContactShadow(
  ctx: HardPixelContext & { globalAlpha: number },
  cx: number,
  footY: number,
  halfWidth: number,
  depth: number
): void {
  ctx.fillStyle = '#0a0408'; // PALETTE.shadowDeep
  ctx.globalAlpha = 0.4;
  for (let dy = -depth; dy <= depth; dy += 1) {
    const t = Math.abs(dy) / depth;
    const w = Math.max(1, Math.round(halfWidth * Math.sqrt(1 - t * t)));
    ctx.fillRect(cx - w, footY + dy, w * 2, 1);
  }
  ctx.globalAlpha = 1;
}
