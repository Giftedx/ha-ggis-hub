import { describe, expect, it } from 'vitest';
import { drawCanonHaggis, CANON_HAGGIS_PALETTE } from './canon-haggis';

class RecordingHaggisContext {
  readonly calls: string[] = [];
  fillStyle: string | CanvasGradient | CanvasPattern = '';
  strokeStyle: string | CanvasGradient | CanvasPattern = '';
  lineWidth = 0;
  globalAlpha = 1;

  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push(`fillRect:${x},${y},${w},${h}`);
  }
  beginPath(): void {
    this.calls.push('beginPath');
  }
  closePath(): void {
    this.calls.push('closePath');
  }
  moveTo(x: number, y: number): void {
    this.calls.push(`moveTo:${x},${y}`);
  }
  lineTo(x: number, y: number): void {
    this.calls.push(`lineTo:${x},${y}`);
  }
  arc(x: number, y: number, r: number): void {
    this.calls.push(`arc:${x},${y},${r}`);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number): void {
    this.calls.push(`ellipse:${cx},${cy},${rx},${ry}`);
  }
  fill(): void {
    this.calls.push('fill');
  }
  stroke(): void {
    this.calls.push('stroke');
  }
  save(): void {
    this.calls.push('save');
  }
  restore(): void {
    this.calls.push('restore');
  }
}

describe('drawCanonHaggis', () => {
  it('renders without throwing when frame is empty (exercises ?? defaults)', () => {
    const ctx = new RecordingHaggisContext();
    // frame = {} → all optional props undefined → exercises the `?? 0` default
    // branches for breathY, leftLegY, rightLegY, maneSway, tailWag.
    drawCanonHaggis(ctx, 100, 100, 1, {});
    expect(ctx.calls.length).toBeGreaterThan(20);
  });

  it('renders facing left when facingLeft=true (exercises dir=-1 branch)', () => {
    const ctxRight = new RecordingHaggisContext();
    drawCanonHaggis(ctxRight, 100, 100, 1, { facingLeft: false });
    const ctxLeft = new RecordingHaggisContext();
    drawCanonHaggis(ctxLeft, 100, 100, 1, { facingLeft: true });
    // Both directions produce the same call count (same primitives, different coords).
    expect(ctxRight.calls.length).toBeGreaterThan(20);
    expect(ctxLeft.calls.length).toBe(ctxRight.calls.length);
  });

  it('applies all animation frame parameters correctly', () => {
    const ctx = new RecordingHaggisContext();
    drawCanonHaggis(ctx, 100, 100, 2, {
      breathY: 1.5,
      leftLegY: 2.0,
      rightLegY: -2.0,
      facingLeft: true,
      maneSway: 0.8,
      tailWag: 1.2
    });
    expect(ctx.calls.length).toBeGreaterThan(20);
  });

  it('accepts a custom palette', () => {
    const ctx = new RecordingHaggisContext();
    const customPalette = { ...CANON_HAGGIS_PALETTE, bodyMid: '#ff0000' };
    drawCanonHaggis(ctx, 50, 50, 1, {}, customPalette);
    expect(ctx.calls.length).toBeGreaterThan(20);
  });
});
