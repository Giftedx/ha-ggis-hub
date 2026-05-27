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
  woodDeep: '#1a0e1a', // deep red-violet (shadow base)
  woodDark: '#3a1e18', // warm red-brown
  woodMid: '#7a4628', // warm wood mid
  woodLit: '#d8a85a', // yellow-shifted warm highlight

  // COOL STONE ramp — bothy walls. Shadow shifts blue-purple, highlight
  // shifts cream.
  stoneDeep: '#181828', // deep blue-violet (shadow)
  stoneDark: '#3a3848', // purple-grey
  stoneMid: '#9a8a78', // warm tan mid
  stoneLit: '#e8d0a0', // cream highlight

  // HAGGIS FUR ramp — protagonist. Hue-shifted ginger going to blonde.
  hagDeep: '#2a1410', // deep red-brown
  hagDark: '#5a3018', // dark ginger
  hagMid: '#a86a30', // ginger
  hagLit: '#f0c878', // bright blonde tip

  // EMBER/ACCENT ramp — hearth glow, dawn highlights. Saturated warm.
  emberDeep: '#4a1408', // deep red
  emberMid: '#c44218', // bright orange-red
  emberHot: '#ffb028', // warm yellow-orange
  emberCore: '#fff0c8', // near-white core
} as const;

// Legacy PALETTE — kept for the existing renderer code paths during
// the migration; new code should use RAMPS only. To be deleted once
// all references are migrated.
export const PALETTE = {
  // --- DAWN POOL (warm + light, inside the beam) ---
  dawnHighlight: '#fff0c8', // brightest, near the window source
  dawnGold: '#ffd078', // warm sun gold
  dawnPeach: '#f4b078', // peach (most-saturated mid)
  dawnCream: '#f0d8a0', // cream-tan for plaster/wood in light
  litWoodHi: '#a07050', // wood plank lit, top edge
  litWoodMid: '#7a4a28', // wood plank lit, body
  litStoneHi: '#e0c090', // stone lit, top edge
  litStoneMid: '#b89060', // stone lit, body
  litStoneShadow: '#6a4828', // stone lit, shadow side

  // --- DAWN EDGE (warm + mid, beam halo / spill) ---
  edgePink: '#f4c8b8', // dawn pink spill
  edgeTan: '#c8a878', // warm tan
  edgeBrown: '#8a6038', // mid ginger / mid wood

  // --- SHADOW (cool + dark, away from beam) ---
  // Pushed ~30% darker after reviewer: "value range too narrow — nothing
  // is near-black, nothing is near-white". The shadow side now actually
  // drops toward black so the dawn pool reads as truly bright by contrast.
  shadowCool: '#1a1422', // peat-cool brown-violet (floor away from light)
  shadowDeep: '#0a0408', // deepest ink shadow (near-black)
  shadowStoneMid: '#3a3036', // stone in shadow, cool
  shadowStoneDark: '#1f1818', // stone in shadow, deep
  shadowStoneHi: '#5a4848', // stone in shadow, top edge (still cool, dimmer)
  shadowWoodMid: '#1f1410', // wood in shadow
  shadowWoodHi: '#3a2218', // wood in shadow, top edge
  shadowHeather: '#28182c', // heather-purple shadow accent

  // --- NEUTRAL / FOCAL ---
  ink: '#1a0e08', // pure outline ink
  bone: '#f0e6c8', // tatties-cream (text, paper)
  haggisHairLit: '#c8a058', // ginger mane in light
  haggisHairMid: '#8a6038', // ginger mane mid
  haggisFaceDark: '#2a1408', // dark face skin
  haggisNose: '#a44030', // dusty rose nose
  emberHot: '#fff0a8', // ember white-hot core
  emberBright: '#ffc060', // ember bright glow
  emberDim: '#c44218', // ember dim red
  whisky: '#c8842a', // brass / whisky highlight
  brassDark: '#7a5018', // brass shadow
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
