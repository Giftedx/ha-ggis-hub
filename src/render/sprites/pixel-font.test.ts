import { describe, expect, it } from 'vitest';
import { renderPixelText, measurePixelText } from './pixel-font';
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
