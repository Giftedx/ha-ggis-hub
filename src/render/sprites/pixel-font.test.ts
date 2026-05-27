import { describe, expect, it } from 'vitest';
import { renderPixelText, measurePixelText, glyph } from './pixel-font';
import type { SpriteBlitContext } from '../sprite';

class MinimalBlitContext implements SpriteBlitContext {
  fillStyle: string | CanvasGradient | CanvasPattern = '';
  readonly calls: string[] = [];
  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push(`fillRect:${x},${y},${w},${h}`);
  }
}

describe('renderPixelText', () => {
  it('renders known characters without throwing', () => {
    const ctx = new MinimalBlitContext();
    const width = renderPixelText(ctx, 'A', 0, 0, 1, '#fff');
    expect(width).toBeGreaterThan(0);
    expect(ctx.calls.length).toBeGreaterThan(0);
  });

  it('substitutes unknown character with space — exercises GLYPHS fallback branch', () => {
    const ctx = new MinimalBlitContext();
    // '@' is not in GLYPHS → substituted with ' ' (space has no pixels, width=3).
    const width = renderPixelText(ctx, '@', 0, 0, 1, '#fff');
    expect(width).toBeGreaterThan(0);
  });
});

describe('measurePixelText', () => {
  it('measures known text', () => {
    expect(measurePixelText('A', 1)).toBeGreaterThan(0);
  });

  it('substitutes unknown character with space — exercises GLYPHS fallback branch', () => {
    // '@' is not in GLYPHS → substituted with ' '.
    expect(measurePixelText('@', 1)).toBeGreaterThan(0);
  });
});

describe('glyph validation', () => {
  const validRows = ['X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'XXXXX'];

  it('throws when row count is not 7', () => {
    expect(() => glyph(['XXXXX'])).toThrow('Glyph must be 7 rows, got 1');
  });

  it('throws when a row is not 5 chars wide', () => {
    const badRows = [...validRows];
    badRows[0] = 'XX';
    expect(() => glyph(badRows)).toThrow("Glyph row must be 5 chars, got 'XX'");
  });

  it('throws when a row contains a character other than . or X', () => {
    const badRows = [...validRows];
    badRows[0] = 'X.Z..';
    expect(() => glyph(badRows)).toThrow("Glyph rows must contain only '.' or 'X'; got 'Z'");
  });
});
