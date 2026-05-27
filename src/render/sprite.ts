// Hand-painted sprite system. A sprite is defined as a palette of single
// characters mapped to colours, plus a grid of strings where each
// character is one pixel. Null palette entry = transparent pixel.
//
// This is deliberately hand-rolled — no library, no asset pipeline. Each
// sprite is authored character-by-character in source and rendered
// pixel-perfect at integer scale.
//
// Example:
//   const HAGGIS_SPRITE = defineSprite({
//     palette: { '.': null, '#': '#3a2418', 'o': '#5a3a20' },
//     pixels: [
//       '..####..',
//       '.#oooo#.',
//       '#oooooo#',
//       '.#oooo#.',
//       '..####..'
//     ]
//   });
//
// Then blit via blitSprite(ctx, MY_SPRITE, cx, cy, scale).

export interface SpriteDefinition {
  readonly palette: Readonly<Record<string, string | null>>;
  readonly pixels: readonly string[];
}

export interface Sprite {
  readonly width: number;
  readonly height: number;
  // Flat array of pixel colours, row-major. null = transparent.
  readonly pixelColours: ReadonlyArray<string | null>;
}

export function defineSprite(def: SpriteDefinition): Sprite {
  const height = def.pixels.length;
  if (height === 0) {
    throw new Error('Sprite must have at least one row');
  }
  const width = def.pixels[0]!.length;
  for (const row of def.pixels) {
    if (row.length !== width) {
      throw new Error(
        `Sprite rows must all be the same width; got ${row.length}, expected ${width}`
      );
    }
  }
  const pixelColours = new Array<string | null>(width * height);
  for (let y = 0; y < height; y += 1) {
    const row = def.pixels[y]!;
    for (let x = 0; x < width; x += 1) {
      const ch = row[x]!;
      if (!Object.prototype.hasOwnProperty.call(def.palette, ch)) {
        throw new Error(`Sprite uses character '${ch}' at (${x}, ${y}) which is not in the palette`);
      }
      pixelColours[y * width + x] = def.palette[ch] ?? null;
    }
  }
  return { width, height, pixelColours };
}

// Structural interface so we can blit against the test recording context
// as well as a real CanvasRenderingContext2D. Matches CanvasRoomContext's
// fillStyle + fillRect surface area.
export interface SpriteBlitContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, width: number, height: number): void;
}

// Blit the sprite onto the context. (cx, cy) is the centre of the sprite
// after scaling — convenient for placing characters at a logical point.
// scale must be a positive integer; non-integer scaling would alias the
// pixel art and ruin the look, so we round.
export function blitSprite(
  ctx: SpriteBlitContext,
  sprite: Sprite,
  cx: number,
  cy: number,
  scale: number
): void {
  const s = Math.max(1, Math.round(scale));
  const originX = Math.round(cx - (sprite.width * s) / 2);
  const originY = Math.round(cy - (sprite.height * s) / 2);
  for (let y = 0; y < sprite.height; y += 1) {
    for (let x = 0; x < sprite.width; x += 1) {
      const colour = sprite.pixelColours[y * sprite.width + x];
      if (colour == null) continue;
      ctx.fillStyle = colour;
      ctx.fillRect(originX + x * s, originY + y * s, s, s);
    }
  }
}

// Convenience: blit at a position where (x, y) is the TOP-LEFT corner of
// the sprite (no centring). Used when you want pixel-precise placement
// (e.g. UI icons, signs).
export function blitSpriteTL(
  ctx: SpriteBlitContext,
  sprite: Sprite,
  x: number,
  y: number,
  scale: number
): void {
  const s = Math.max(1, Math.round(scale));
  for (let yy = 0; yy < sprite.height; yy += 1) {
    for (let xx = 0; xx < sprite.width; xx += 1) {
      const colour = sprite.pixelColours[yy * sprite.width + xx];
      if (colour == null) continue;
      ctx.fillStyle = colour;
      ctx.fillRect(x + xx * s, y + yy * s, s, s);
    }
  }
}
