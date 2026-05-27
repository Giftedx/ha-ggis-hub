// Hand-painted 5×7 pixel font — uppercase Latin + digits + punctuation
// the hub scene needs. Authored character-by-character so every glyph is
// hard-pixel and palette-pure (per rules.md §6: no anti-aliased browser
// fonts in-scene).
//
// Each glyph is a Sprite whose palette is { '.': null, 'X': colour }.
// The colour is passed at render time so the same glyph can be tinted to
// bone, dawnGold, shadowDeep, etc. — we recompose a tiny per-call sprite
// instead of baking palette colour into the grid.
//
// Glyph anatomy (5 wide × 7 tall):
//   row 0 — top cap
//   row 1 — upper bowl / crossbar zone
//   row 2 — upper-mid
//   row 3 — middle (crossbar for A/E/F/H, joint for B/R/etc.)
//   row 4 — lower-mid
//   row 5 — lower bowl
//   row 6 — baseline
// Descenders are NOT supported — keeps the baseline rock-solid for
// signage and prompts. (No need for them: the hub text is uppercase.)
//
// Kerning: GLYPH_WIDTHS gives the visible width per glyph. Narrow
// glyphs like 'I', '.', ',' use less than 5 so they don't read as
// over-wide gaps. The renderer always inserts a 1px spacer between
// glyphs regardless.

import { defineSprite, type Sprite, type SpriteBlitContext } from '../sprite';

const GLYPH_HEIGHT = 7;
const GLYPH_FULL_WIDTH = 5;
const GLYPH_SPACING = 1; // 1px between glyphs at scale 1

// Author a glyph. Caller passes a 7-row array of 5-char strings using
// '.' (transparent) and 'X' (painted). Returns a Sprite where X is a
// sentinel colour the renderer overrides per-call.
const PAINT = '#ffffff'; // sentinel — renderer swaps this for the call colour
export function glyph(rows: readonly string[]): Sprite {
  if (rows.length !== GLYPH_HEIGHT) {
    throw new Error(`Glyph must be ${GLYPH_HEIGHT} rows, got ${rows.length}`);
  }
  for (const row of rows) {
    if (row.length !== GLYPH_FULL_WIDTH) {
      throw new Error(`Glyph row must be ${GLYPH_FULL_WIDTH} chars, got '${row}'`);
    }
    for (const ch of row) {
      if (ch !== '.' && ch !== 'X') {
        throw new Error(`Glyph rows must contain only '.' or 'X'; got '${ch}'`);
      }
    }
  }
  return defineSprite({
    palette: { '.': null, X: PAINT },
    pixels: rows,
  });
}

// =====================================================================
// GLYPHS — A-Z uppercase, 0-9, space, ' — - . ,
// Authored in a classic readable 5×7 style (NES / MS Sans 5×7 family).
// Each glyph fits inside a 5×7 cell with at least 1 empty column on the
// right when its visible width < 5 (handled via GLYPH_WIDTHS).
// =====================================================================

export const GLYPHS: Record<string, Sprite> = {
  // --- LETTERS A-Z ---
  A: glyph(['.XXX.', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X']),
  B: glyph(['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X...X', 'X...X', 'XXXX.']),
  C: glyph(['.XXXX', 'X....', 'X....', 'X....', 'X....', 'X....', '.XXXX']),
  D: glyph(['XXXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'XXXX.']),
  E: glyph(['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'XXXXX']),
  F: glyph(['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'X....']),
  G: glyph(['.XXXX', 'X....', 'X....', 'X.XXX', 'X...X', 'X...X', '.XXX.']),
  H: glyph(['X...X', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X']),
  I: glyph(['XXX..', '.X...', '.X...', '.X...', '.X...', '.X...', 'XXX..']),
  J: glyph(['..XXX', '...X.', '...X.', '...X.', '...X.', 'X..X.', '.XX..']),
  K: glyph(['X...X', 'X..X.', 'X.X..', 'XX...', 'X.X..', 'X..X.', 'X...X']),
  L: glyph(['X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'XXXXX']),
  M: glyph(['X...X', 'XX.XX', 'X.X.X', 'X.X.X', 'X...X', 'X...X', 'X...X']),
  N: glyph(['X...X', 'XX..X', 'XX..X', 'X.X.X', 'X..XX', 'X..XX', 'X...X']),
  O: glyph(['.XXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.']),
  P: glyph(['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X....', 'X....', 'X....']),
  Q: glyph(['.XXX.', 'X...X', 'X...X', 'X...X', 'X.X.X', 'X..X.', '.XX.X']),
  R: glyph(['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X.X..', 'X..X.', 'X...X']),
  S: glyph(['.XXXX', 'X....', 'X....', '.XXX.', '....X', '....X', 'XXXX.']),
  T: glyph(['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..']),
  U: glyph(['X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.']),
  V: glyph(['X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.X.X.', '..X..']),
  W: glyph(['X...X', 'X...X', 'X...X', 'X.X.X', 'X.X.X', 'XX.XX', 'X...X']),
  X: glyph(['X...X', 'X...X', '.X.X.', '..X..', '.X.X.', 'X...X', 'X...X']),
  Y: glyph(['X...X', 'X...X', '.X.X.', '..X..', '..X..', '..X..', '..X..']),
  Z: glyph(['XXXXX', '....X', '...X.', '..X..', '.X...', 'X....', 'XXXXX']),

  // --- DIGITS 0-9 ---
  '0': glyph(['.XXX.', 'X...X', 'X..XX', 'X.X.X', 'XX..X', 'X...X', '.XXX.']),
  '1': glyph(['.XX..', 'X.X..', '..X..', '..X..', '..X..', '..X..', 'XXXXX']),
  '2': glyph(['.XXX.', 'X...X', '....X', '...X.', '..X..', '.X...', 'XXXXX']),
  '3': glyph(['XXXX.', '....X', '....X', '.XXX.', '....X', '....X', 'XXXX.']),
  '4': glyph(['...X.', '..XX.', '.X.X.', 'X..X.', 'XXXXX', '...X.', '...X.']),
  '5': glyph(['XXXXX', 'X....', 'X....', 'XXXX.', '....X', '....X', 'XXXX.']),
  '6': glyph(['.XXX.', 'X....', 'X....', 'XXXX.', 'X...X', 'X...X', '.XXX.']),
  '7': glyph(['XXXXX', '....X', '...X.', '..X..', '.X...', '.X...', '.X...']),
  '8': glyph(['.XXX.', 'X...X', 'X...X', '.XXX.', 'X...X', 'X...X', '.XXX.']),
  '9': glyph(['.XXX.', 'X...X', 'X...X', '.XXXX', '....X', '....X', '.XXX.']),

  // --- PUNCTUATION ---
  ' ': glyph(['.....', '.....', '.....', '.....', '.....', '.....', '.....']),
  // Apostrophe — single tick at the cap height
  "'": glyph(['.X...', '.X...', '.....', '.....', '.....', '.....', '.....']),
  // Hyphen — short bar at the mid line
  '-': glyph(['.....', '.....', '.....', 'XXX..', '.....', '.....', '.....']),
  // Em-dash — full-width bar at the mid line
  '—': glyph(['.....', '.....', '.....', 'XXXXX', '.....', '.....', '.....']),
  // Period — single block on the baseline
  '.': glyph(['.....', '.....', '.....', '.....', '.....', '.....', 'X....']),
  // Comma — block + tail dropping below baseline (we only have 7 rows
  // so the tail is on the baseline; reads as comma in context)
  ',': glyph(['.....', '.....', '.....', '.....', '.....', 'XX...', 'X....']),
  // Curly apostrophe (U+2019) — alias to the same shape as straight '
  '’': glyph(['.X...', '.X...', '.....', '.....', '.....', '.....', '.....']),
};

// =====================================================================
// GLYPH_WIDTHS — visible width used for kerning. The renderer advances
// by this many columns + GLYPH_SPACING before placing the next glyph.
// Narrow glyphs get smaller widths so the kerning doesn't read as gaps.
// =====================================================================

export const GLYPH_WIDTHS: Record<string, number> = {
  // Letters — most are 5; a few naturally narrow ones get 3
  A: 5,
  B: 5,
  C: 5,
  D: 5,
  E: 5,
  F: 5,
  G: 5,
  H: 5,
  I: 3,
  J: 5,
  K: 5,
  L: 5,
  M: 5,
  N: 5,
  O: 5,
  P: 5,
  Q: 5,
  R: 5,
  S: 5,
  T: 5,
  U: 5,
  V: 5,
  W: 5,
  X: 5,
  Y: 5,
  Z: 5,
  // Digits
  '0': 5,
  '1': 5,
  '2': 5,
  '3': 5,
  '4': 5,
  '5': 5,
  '6': 5,
  '7': 5,
  '8': 5,
  '9': 5,
  // Punctuation
  ' ': 3,
  "'": 2,
  '’': 2,
  '-': 4,
  '—': 5,
  '.': 2,
  ',': 2,
};

// =====================================================================
// renderPixelText — walks a string, blits each glyph in `colour` at
// (x, y) top-left, kerning by GLYPH_WIDTHS + GLYPH_SPACING. Unknown
// chars are substituted with space. Returns total width painted in
// canvas pixels (useful for caller-side centring / backgrounds).
// =====================================================================

export function renderPixelText(
  ctx: SpriteBlitContext,
  text: string,
  x: number,
  y: number,
  scale: number,
  colour: string
): number {
  const s = Math.max(1, Math.round(scale));
  // Uppercase the input so lowercase characters in caller text route
  // to the uppercase glyph map. The font is single-case by design.
  const upper = text.toUpperCase();
  let cursor = x;
  for (const rawCh of upper) {
    const ch = GLYPHS[rawCh] !== undefined ? rawCh : ' ';
    const sprite = GLYPHS[ch]!;
    /* c8 ignore next — every GLYPHS key has a matching GLYPH_WIDTHS entry; ?? fallback is unreachable */
    const visibleWidth = GLYPH_WIDTHS[ch] ?? GLYPH_FULL_WIDTH;
    // Blit pixel-by-pixel; substitute the call colour for the sentinel.
    for (let yy = 0; yy < sprite.height; yy += 1) {
      for (let xx = 0; xx < sprite.width; xx += 1) {
        const cell = sprite.pixelColours[yy * sprite.width + xx];
        if (cell === null || cell === undefined) continue;
        ctx.fillStyle = colour;
        ctx.fillRect(cursor + xx * s, y + yy * s, s, s);
      }
    }
    cursor += visibleWidth * s + GLYPH_SPACING * s;
  }
  return cursor - x;
}

// Measure text without drawing — useful for centring or background
// plates. Mirrors renderPixelText's kerning exactly.
export function measurePixelText(text: string, scale: number): number {
  const s = Math.max(1, Math.round(scale));
  const upper = text.toUpperCase();
  let total = 0;
  for (const rawCh of upper) {
    const ch = GLYPHS[rawCh] !== undefined ? rawCh : ' ';
    /* c8 ignore next — every GLYPHS key has a matching GLYPH_WIDTHS entry; ?? fallback is unreachable */
    const visibleWidth = GLYPH_WIDTHS[ch] ?? GLYPH_FULL_WIDTH;
    total += visibleWidth * s + GLYPH_SPACING * s;
  }
  return total;
}

// Exported font metrics — used by callers sizing background plates.
export const PIXEL_FONT_HEIGHT = GLYPH_HEIGHT;
export const PIXEL_FONT_SPACING = GLYPH_SPACING;
