import { describe, it, expect } from 'vitest';
import { makeBeamGeometry, lightZoneAt, hardContactShadow, PALETTE } from './palette';

// ---------------------------------------------------------------------------
// makeBeamGeometry + lightZoneAt
// ---------------------------------------------------------------------------
describe('makeBeamGeometry', () => {
  it('centres beam horizontally', () => {
    const b = makeBeamGeometry(540, 360, 30);
    expect(b.cx).toBe(270);
  });
  it('topY is backWallThick + 1', () => {
    const b = makeBeamGeometry(540, 360, 30);
    expect(b.topY).toBe(31);
  });
});

describe('lightZoneAt', () => {
  const beam = makeBeamGeometry(540, 360, 30);

  it('returns shadow above beam', () => {
    expect(lightZoneAt(270, 5, beam)).toBe('shadow');
  });
  it('returns shadow below beam', () => {
    expect(lightZoneAt(270, beam.topY + beam.length + 10, beam)).toBe('shadow');
  });
  it('returns pool at beam centre', () => {
    const y = beam.topY + 10;
    expect(lightZoneAt(beam.cx, y, beam)).toBe('pool');
  });
  it('returns shadow far from beam centre at valid y', () => {
    const y = beam.topY + 10;
    expect(lightZoneAt(beam.cx + 300, y, beam)).toBe('shadow');
  });
  it('returns edge in the halo band', () => {
    // Just outside inner half width at midpoint of beam
    const y = Math.round(beam.topY + beam.length / 2);
    const t = (y - beam.topY) / beam.length;
    const innerHalf = beam.topHalfWidth + (beam.bottomHalfWidth - beam.topHalfWidth) * t;
    // innerHalf + 5 should be in the edge zone (halo band = 18px wide)
    const x = Math.round(beam.cx + innerHalf + 5);
    expect(lightZoneAt(x, y, beam)).toBe('edge');
  });
});

// ---------------------------------------------------------------------------
// hardContactShadow — the canonical shared contact-shadow primitive (rules.md
// §3). It is the one exported render primitive other draws build on, so it
// MUST honour Canvas2D state isolation: draw its scanlines, then leave the
// context exactly as it found it. A recording context whose save()/restore()
// snapshot the same state the real Canvas2D stack preserves (fillStyle +
// globalAlpha) lets us assert both the draw and the isolation.
// ---------------------------------------------------------------------------
describe('hardContactShadow', () => {
  interface RecordedRect {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
    readonly fillStyle: string;
    readonly globalAlpha: number;
  }

  function makeRecordingCtx(initial: { fillStyle: string; globalAlpha: number }) {
    const stack: { fillStyle: string; globalAlpha: number }[] = [];
    const rects: RecordedRect[] = [];
    return {
      fillStyle: initial.fillStyle,
      globalAlpha: initial.globalAlpha,
      rects,
      save(): void {
        stack.push({ fillStyle: this.fillStyle, globalAlpha: this.globalAlpha });
      },
      restore(): void {
        const snapshot = stack.pop();
        if (snapshot !== undefined) {
          this.fillStyle = snapshot.fillStyle;
          this.globalAlpha = snapshot.globalAlpha;
        }
      },
      fillRect(x: number, y: number, w: number, h: number): void {
        rects.push({ x, y, w, h, fillStyle: this.fillStyle, globalAlpha: this.globalAlpha });
      },
    };
  }

  it('draws every shadow scanline at the fixed 0.4 alpha in the shadowDeep token', () => {
    const ctx = makeRecordingCtx({ fillStyle: '#caller-fill', globalAlpha: 0.5 });
    hardContactShadow(ctx, 100, 50, 20, 3);
    expect(ctx.rects.length).toBeGreaterThan(0);
    expect(ctx.rects.every((r) => r.globalAlpha === 0.4)).toBe(true);
    expect(ctx.rects.every((r) => r.fillStyle === PALETTE.shadowDeep)).toBe(true);
  });

  it('restores the caller fillStyle and globalAlpha instead of leaking shadow state', () => {
    const ctx = makeRecordingCtx({ fillStyle: '#caller-fill', globalAlpha: 0.5 });
    hardContactShadow(ctx, 100, 50, 20, 3);
    expect(ctx.fillStyle).toBe('#caller-fill');
    expect(ctx.globalAlpha).toBe(0.5);
  });
});
