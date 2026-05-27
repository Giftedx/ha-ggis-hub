import { defineSprite, type Sprite } from '../sprite';
import { PALETTE } from '../palette';

// Bothy door + hanging sign + wall lantern. Replaces the placeholder
// procedural WHS panel on the right wall. All colours sourced from the
// locked PALETTE so the assets sit inside the dawn value plan.

// =============================================================
// DOOR_OPEN — 28 wide × 50 tall
// =============================================================
//
// A stout bothy door viewed in elevation. Six vertical planks with a
// gentle arch at the top, two black iron hinges on the left edge, and
// a brass handle on the right. Lit by dawn light (litWood family).
//
// Palette characters:
//   . = transparent
//   k = ink outline / iron hinge / deep shadow
//   d = wood plank shadow (mortar between planks, deep grain)
//   m = wood plank mid (body of plank)
//   h = wood plank highlight (top of plank, lit edge)
//   b = brass handle highlight
//   B = brass handle shadow

const DOOR_PALETTE = {
  '.': null,
  k: PALETTE.ink,
  d: PALETTE.shadowWoodMid,
  m: PALETTE.litWoodMid,
  h: PALETTE.litWoodHi,
  b: PALETTE.whisky,
  B: PALETTE.brassDark,
} as const;

// 28 wide × 50 tall. Four vertical planks separated by 1px dark grain.
// Plank columns: cols 1-6, 8-13, 15-20, 22-26.  Gap cols: 7, 14, 21.
// Frame cols: 0 and 27 (ink).
//
// Arched top: rows 0-3 curve in from the corners (lintel arch).
// Iron hinge straps span rows 9-11 and 38-40 on the left side
// (cols 1-9) and the right side (cols 18-26). Brass handle is a
// 3-wide ring at rows 26-28 near the right edge.
export const DOOR_OPEN: Sprite = defineSprite({
  palette: DOOR_PALETTE,
  pixels: [
    '..........kkkkkkkk..........', //  0  arch peak narrow
    '........kkmmmmmmmmkk........', //  1  arch shoulder
    '......kkmmmmmmmmmmmmkk......', //  2  arch flank
    '....kkmmhhhhhhhhhhhhmmkk....', //  3  arch base highlight ring
    '..kkmhmmmmmmmmmmmmmmmmhmkk..', //  4  arch outer
    '.kmhmmmmdmmmmmdmmmmmdmmmmhk.', //  5  plank tops start (gaps at cols 8,14,20)
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', //  6
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', //  7
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', //  8
    'kkkkkkkkkkkkkkdmmmmmdmmmmmhk', //  9  iron hinge strap top
    'kkkkkkkkkkkkkkdmmmmmdmmmmmhk', // 10  iron hinge strap mid
    'kkkkkkkkkkkkkkdmmmmmdmmmmmhk', // 11  iron hinge strap bot
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 12
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 13
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 14
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 15
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 16
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 17
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 18
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 19
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 20
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 21
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 22
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 23
    'kmhmmmmmdmmmmmdmmmmmdmmmkkhk', // 24  handle plate top
    'kmhmmmmmdmmmmmdmmmmmdmmkBBBk', // 25  handle ring top
    'kmhmmmmmdmmmmmdmmmmmdmmkBbBk', // 26  handle body
    'kmhmmmmmdmmmmmdmmmmmdmmkBbBk', // 27  handle body
    'kmhmmmmmdmmmmmdmmmmmdmmkBBBk', // 28  handle ring bot
    'kmhmmmmmdmmmmmdmmmmmdmmmkkhk', // 29  handle plate bot
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 30
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 31
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 32
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 33
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 34
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 35
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 36
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 37
    'kkkkkkkkkkkkkkdmmmmmdmmmmmhk', // 38  iron hinge strap top
    'kkkkkkkkkkkkkkdmmmmmdmmmmmhk', // 39  iron hinge strap mid
    'kkkkkkkkkkkkkkdmmmmmdmmmmmhk', // 40  iron hinge strap bot
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 41
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 42
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 43
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 44
    'kmhmmmmmdmmmmmdmmmmmdmmmmmhk', // 45
    'kmddddddddddddddddddddddddhk', // 46  threshold shadow band
    'kdddddddddddddddddddddddddhk', // 47
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkk', // 48  ink base line
    '............................', // 49  base padding
  ],
});

// =============================================================
// DOOR_SIGN — 64 wide × 22 tall
// =============================================================
//
// A weathered oak plank sign suspended by knotted ropes from above,
// reinforced at all four corners with brass plates. The renderer
// overlays the destination label (e.g. "WHS") at scale 2 across the
// centre of the board, so all the wood-craft detail (grain, weathering,
// grommet) lives in the bands that frame the text rather than under it.
//
// Re-authored after the reviewer flagged the previous flat-tan plank as
// "weakest pixel work in frame". The new sign has a real value plan:
//   • outer ink outline (1px) — chiaroscuro frame
//   • shadowDeep inner border — beveled "set-in" reading
//   • shadowWoodHi band — secondary highlight inside the bevel
//   • litWoodHi top edge highlight + grommet
//   • litWoodMid body with shadowWoodMid horizontal grain streaks
//   • shadowWoodMid weathering patch in one corner (asymmetric)
//   • twisted-rope hangers in edgeBrown / edgeTan above each brass corner
//   • whisky brass corner plates with brassDark shadow on the lit side
//
// Palette characters:
//   . = transparent
//   k = ink outline (PALETTE.ink)
//   K = inner border / deep shadow (PALETTE.shadowDeep)
//   D = shadow-wood highlight band (PALETTE.shadowWoodHi)
//   m = board body / lit wood mid (PALETTE.litWoodMid)
//   h = top edge highlight / lit wood hi (PALETTE.litWoodHi)
//   d = wood grain & weathering streak (PALETTE.shadowWoodMid)
//   b = brass plate body (PALETTE.whisky)
//   B = brass plate shadow (PALETTE.brassDark)
//   r = rope highlight / lit twist (PALETTE.edgeTan)
//   R = rope shadow / dark twist (PALETTE.edgeBrown)
//   g = grommet ink (PALETTE.ink)

const SIGN_PALETTE = {
  '.': null,
  k: PALETTE.ink,
  K: PALETTE.shadowDeep,
  D: PALETTE.shadowWoodHi,
  m: PALETTE.litWoodMid,
  h: PALETTE.litWoodHi,
  d: PALETTE.shadowWoodMid,
  b: PALETTE.whisky,
  B: PALETTE.brassDark,
  r: PALETTE.edgeTan,
  R: PALETTE.edgeBrown,
  g: PALETTE.ink,
} as const;

// 64 wide × 22 tall. Layout (top to bottom):
//   rows 0-3   twisted rope hangers above each top-corner brass plate
//   row  4     ink top edge with 2×2 brass corners
//   row  5     shadowDeep inner border + brass corner second row
//   row  6     top-edge highlight band (litWoodHi) + grommet at cols 30-31
//   row  7     shadowWoodHi (D) secondary band
//   rows 8-16  body in litWoodMid with three horizontal grain streaks
//              (asymmetric placement: a long streak top-left, a short
//              streak mid-right, a faint streak bottom-left)
//   row  17    shadowWoodHi (D) lower band + weathering darkening
//   row  18    shadowDeep inner border + brass corner top row
//   row  19    ink bottom edge with 2×2 brass corners
//   rows 20-21 transparent padding to keep the sprite centred
//
// The grommet (g) at cols 30-31 sits in the highlight band — visually it
// reads as a punched suspension hole even when the text overlay covers
// the body. Weathering darkening lives in the bottom-right (rows 16-17,
// cols 50-58) to break symmetry — reviewer rule §7 (break the grid).
export const DOOR_SIGN: Sprite = defineSprite({
  palette: SIGN_PALETTE,
  pixels: [
    'rRr..........................................................rRr', //  0  rope strand top
    'RRr..........................................................rRR', //  1  rope twist
    'rRR..........................................................RRr', //  2  rope twist
    'RrR..........................................................RrR', //  3  rope knot above brass
    'bbkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkbb', //  4  brass corners + ink top edge
    'bBKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKBb', //  5  brass underside + shadowDeep inner border
    'kKhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhggghhhhhhhhhhhhhhhhhhhhhhhhhhhKk', //  6  top-edge highlight + grommet
    'kKDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDKk', //  7  shadowWoodHi band
    'kKmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmKk', //  8  body
    'kKmddddddddddddmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmKk', //  9  grain streak A (top-left, long)
    'kKmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmKk', // 10
    'kKmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmddddddmmmmmmmmmmmKk', // 11  grain streak B (mid-right, short)
    'kKmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmKk', // 12
    'kKmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmKk', // 13
    'kKmmmmmddddddddmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmKk', // 14  grain streak C (mid-left, medium)
    'kKmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmKk', // 15
    'kKmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmddddddddmmmmKk', // 16  grain streak D (bottom-right, weathering)
    'kKDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDddddddddDDDDKk', // 17  shadowWoodHi band + weathering bleed
    'bBKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKBb', // 18  shadowDeep inner border + brass top row
    'bbkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkbb', // 19  ink bottom edge + brass corners
    '................................................................', // 20  padding
    '................................................................', // 21  padding
  ],
});

// =============================================================
// LANTERN_LIT — 18 wide × 28 tall
// =============================================================
//
// Iron wall lantern: bracket arm protrudes up from the cage top, cage
// is a rectangular iron frame with one crossbar, glass interior glows
// warm dawn-gold with a brighter flame highlight near the centre.
//
// Palette characters:
//   . = transparent
//   k = iron frame / bracket (ink)
//   r = brass ring / cap (whisky)
//   g = glass body warm glow (dawnGold)
//   G = glass body bright (dawnHighlight)
//   p = glass body dim warm (dawnPeach) — outer glass tint
//   e = ember dim (whisky) for chain/spike accents

const LANTERN_PALETTE = {
  '.': null,
  k: PALETTE.ink,
  r: PALETTE.whisky,
  g: PALETTE.dawnGold,
  G: PALETTE.dawnHighlight,
  p: PALETTE.dawnPeach,
  e: PALETTE.brassDark,
} as const;

// 18 wide × 28 tall. Bracket arm extends up-left from the cage hanger
// (rows 0-4) suggesting a wall mount; brass cap sits at the top of the
// cage; cage is a tall iron rectangle (verticals at cols 4 and 13) with
// crossbars at rows 6, 12, 17, 22; glass interior glows dawnPeach (p)
// → dawnGold (g) → dawnHighlight (G) toward the centre. Single flame
// core at rows 13-14.
export const LANTERN_LIT: Sprite = defineSprite({
  palette: LANTERN_PALETTE,
  pixels: [
    '......kkkkkk......', //  0  bracket cross-piece (mount)
    '........kk........', //  1  bracket arm
    '........kk........', //  2  bracket arm
    '........kk........', //  3  bracket arm
    '........kk........', //  4  bracket joins cap
    '....kkkkkkkk......', //  5  cap top ink
    '....krrrrrrk......', //  6  brass cap
    '....kkkkkkkk......', //  7  cap base ink
    '....k......k......', //  8  cage shoulders
    '....kpgggpgk......', //  9
    '....kggggggk......', // 10
    '....kpggGggk......', // 11
    '....kkkkkkkk......', // 12  crossbar
    '....kggGGggk......', // 13  flame top
    '....kgGGGGgk......', // 14  flame core
    '....kggGGggk......', // 15
    '....kpggggpk......', // 16
    '....kkkkkkkk......', // 17  crossbar
    '....kgggggpk......', // 18
    '....kpgggppk......', // 19
    '....kpgppppk......', // 20
    '....kppppppk......', // 21
    '....kkkkkkkk......', // 22  cage bottom
    '....keeeeeek......', // 23  brass base shadow
    '....krrrrrrk......', // 24  brass base
    '....kkkkkkkk......', // 25  base ink
    '......kkkk........', // 26  drop finial
    '.......kk.........', // 27  drop spike
  ],
});
