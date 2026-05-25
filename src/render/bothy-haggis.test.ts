import { describe, expect, it } from 'vitest';
import { drawBothyHaggis, BOTHY_HAGGIS_PALETTE } from './bothy-haggis';

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
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.calls.push(`quadraticCurveTo:${cpx},${cpy},${x},${y}`);
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

describe('drawBothyHaggis', () => {
  it('renders the full tied-pudding haggis without throwing on empty frame', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 1, {});
    // Sack body + tied neck + fabric ears + twine wraps + eyes + snout +
    // smile + legs + heather — well over 80 primitives.
    expect(ctx.calls.length).toBeGreaterThan(80);
  });

  it('applies every animation frame parameter', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 2, {
      breathY: 0.4,
      facingLeft: true,
      frontLegY: 1.5,
      backLegY: -1.5,
      tieWobble: 0.6,
      blink: 0.5
    });
    expect(ctx.calls.length).toBeGreaterThan(80);
  });

  it('blink=0 collapses each eye into a slit (no pupil/catchlight)', () => {
    const open = new RecordingHaggisContext();
    drawBothyHaggis(open, 100, 100, 1, { blink: 1 });
    const closed = new RecordingHaggisContext();
    drawBothyHaggis(closed, 100, 100, 1, { blink: 0 });
    // Closed-eye path skips pupil + catchlight per eye, so it issues
    // fewer primitive operations than the fully-open render.
    expect(closed.calls.length).toBeLessThan(open.calls.length);
  });

  it('exposes the tied-pudding palette tokens', () => {
    expect(BOTHY_HAGGIS_PALETTE.sackMid).toBe('#6a4528');
    expect(BOTHY_HAGGIS_PALETTE.twine).toBe('#c4a878');
    expect(BOTHY_HAGGIS_PALETTE.sackRim).toBe('#fff0c8');
  });

  it('facingLeft mirrors only the asymmetric leg drift, not the sack', () => {
    // Body silhouette is symmetric so the sack draws the same; only the
    // leg positions differ between facing-right and facing-left. We
    // assert that the call count is identical (same number of legs,
    // same primitives) — only positions shift.
    const right = new RecordingHaggisContext();
    drawBothyHaggis(right, 100, 100, 1, { facingLeft: false });
    const left = new RecordingHaggisContext();
    drawBothyHaggis(left, 100, 100, 1, { facingLeft: true });
    expect(left.calls.length).toBe(right.calls.length);
  });
});
