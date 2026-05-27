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

export const RAMPS = {
  // WARM WOOD ramp — log fuel in the hearth
  woodDeep: '#1a0e1a',
  woodDark: '#3a1e18',

  // EMBER/ACCENT ramp — hearth glow
  emberDeep: '#4a1408',
  emberMid: '#c44218',
  emberHot: '#ffb028',
  emberCore: '#fff0c8',
} as const;

export const PALETTE = {
  // --- DAWN POOL (warm + light, inside the beam) ---
  dawnHighlight: '#fff0c8',
  dawnGold: '#ffd078',
  dawnPeach: '#f4b078',
  litWoodHi: '#a07050',
  litWoodMid: '#7a4a28',
  litStoneHi: '#e0c090',
  litStoneMid: '#b89060',

  // --- DAWN EDGE (warm + mid, beam halo / spill) ---
  edgePink: '#f4c8b8',
  edgeTan: '#c8a878',
  edgeBrown: '#8a6038',

  // --- SHADOW (cool + dark, away from beam) ---
  shadowDeep: '#0a0408',
  shadowStoneMid: '#3a3036',
  shadowStoneDark: '#1f1818',
  shadowWoodMid: '#1f1410',
  shadowWoodHi: '#3a2218',
  shadowHeather: '#28182c',

  // --- NEUTRAL / FOCAL ---
  ink: '#1a0e08',
  bone: '#f0e6c8',
  whisky: '#c8842a',
  brassDark: '#7a5018',
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
  readonly cx: number; // centre x of beam (window centre)
  readonly topY: number; // y where beam emerges (window sill)
  readonly length: number; // beam depth
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
    bottomHalfWidth: 110,
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
// HARD-PIXEL CONTEXT
// =============================================================

export interface HardPixelContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, width: number, height: number): void;
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
