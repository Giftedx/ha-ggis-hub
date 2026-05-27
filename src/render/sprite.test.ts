import { describe, expect, it } from 'vitest';
import { defineSprite, blitSprite, blitSpriteTL, type SpriteBlitContext } from './sprite';

class RecordingBlitContext implements SpriteBlitContext {
  fillStyle: string | CanvasGradient | CanvasPattern = '';
  readonly calls: string[] = [];
  fillRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`${this.fillStyle as string}@${x},${y},${width},${height}`);
  }
}

describe('defineSprite', () => {
  it('rejects an empty pixel grid', () => {
    expect(() => defineSprite({ palette: {}, pixels: [] })).toThrow(/at least one row/);
  });

  it('rejects rows of unequal width', () => {
    expect(() =>
      defineSprite({
        palette: { '.': null, '#': '#000' },
        pixels: ['##', '###']
      })
    ).toThrow(/same width/);
  });

  it('rejects characters not in the palette', () => {
    expect(() =>
      defineSprite({
        palette: { '.': null },
        pixels: ['.x.']
      })
    ).toThrow(/not in the palette/);
  });

  it('parses a simple 3x3 sprite with transparent corners', () => {
    const sprite = defineSprite({
      palette: { '.': null, '#': '#abc' },
      pixels: ['.#.', '###', '.#.']
    });
    expect(sprite.width).toBe(3);
    expect(sprite.height).toBe(3);
    expect(sprite.pixelColours).toEqual([
      null, '#abc', null,
      '#abc', '#abc', '#abc',
      null, '#abc', null
    ]);
  });
});

describe('blitSprite', () => {
  it('skips transparent pixels and emits one fillRect per opaque pixel at integer scale', () => {
    const sprite = defineSprite({
      palette: { '.': null, '#': '#fff' },
      pixels: ['.#.', '###', '.#.']
    });
    const ctx = new RecordingBlitContext();
    blitSprite(ctx, sprite, 10, 10, 1);
    // 5 opaque pixels; centre at (10,10) for 3x3 → origin (9,9)
    expect(ctx.calls.length).toBe(5);
    expect(ctx.calls).toContain('#fff@10,9,1,1'); // top centre
    expect(ctx.calls).toContain('#fff@9,10,1,1'); // mid left
    expect(ctx.calls).toContain('#fff@10,10,1,1'); // mid centre
    expect(ctx.calls).toContain('#fff@11,10,1,1'); // mid right
    expect(ctx.calls).toContain('#fff@10,11,1,1'); // bottom centre
  });

  it('scales pixel-perfect at integer scale', () => {
    const sprite = defineSprite({
      palette: { '.': null, '#': '#000' },
      pixels: ['##']
    });
    const ctx = new RecordingBlitContext();
    blitSprite(ctx, sprite, 4, 4, 2);
    // 2x1 sprite at scale 2 → 4x2 image, centred at (4,4) → origin (2,3)
    expect(ctx.calls.length).toBe(2);
    expect(ctx.calls).toContain('#000@2,3,2,2');
    expect(ctx.calls).toContain('#000@4,3,2,2');
  });

  it('rounds non-integer scales up to the nearest integer to keep pixels crisp', () => {
    const sprite = defineSprite({
      palette: { '.': null, '#': '#000' },
      pixels: ['#']
    });
    const ctx = new RecordingBlitContext();
    blitSprite(ctx, sprite, 0, 0, 1.4);
    // 1.4 rounds down to 1; JS Math.round(-0.5) = 0, so origin is (0,0)
    expect(ctx.calls).toEqual(['#000@0,0,1,1']);
  });
});

describe('blitSpriteTL', () => {
  it('uses top-left as the placement anchor instead of centre', () => {
    const sprite = defineSprite({
      palette: { '.': null, '#': '#000' },
      pixels: ['##', '##']
    });
    const ctx = new RecordingBlitContext();
    blitSpriteTL(ctx, sprite, 100, 200, 1);
    expect(ctx.calls.length).toBe(4);
    expect(ctx.calls).toContain('#000@100,200,1,1');
    expect(ctx.calls).toContain('#000@101,201,1,1');
  });

  it('skips transparent (null) pixels', () => {
    const sprite = defineSprite({
      palette: { '.': null, '#': '#000' },
      pixels: ['.#', '#.']
    });
    const ctx = new RecordingBlitContext();
    blitSpriteTL(ctx, sprite, 10, 20, 1);
    expect(ctx.calls.length).toBe(2);
    expect(ctx.calls).toContain('#000@11,20,1,1');
    expect(ctx.calls).toContain('#000@10,21,1,1');
  });
});
