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
  it('renders the minimal folk haggis without throwing on empty frame', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 1, {});
    // Body silhouette (2 fills) + tartan band (5 ellipses) + ribbon
    // twists (2 paths) + 4 legs + 2 eye dots + heather (1 ellipse + 2 dots).
    // Should comfortably exceed 30 primitives.
    expect(ctx.calls.length).toBeGreaterThan(30);
  });

  it('applies every supported frame parameter', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 2, {
      breathY: 0.4,
      facingLeft: true,
      frontLegY: 1.5,
      backLegY: -1.5
    });
    expect(ctx.calls.length).toBeGreaterThan(30);
  });

  it('exposes the minimal committed-silhouette palette', () => {
    expect(BOTHY_HAGGIS_PALETTE.body).toBe('#5a3220');
    expect(BOTHY_HAGGIS_PALETTE.tartanRed).toBe('#9c2018');
    expect(BOTHY_HAGGIS_PALETTE.tartanGreen).toBe('#1f4628');
    expect(BOTHY_HAGGIS_PALETTE.tartanCream).toBe('#f4d8a0');
    expect(BOTHY_HAGGIS_PALETTE.eye).toBe('#0a0604');
  });

  it('facingLeft mirrors leg drift only — same call count', () => {
    const right = new RecordingHaggisContext();
    drawBothyHaggis(right, 100, 100, 1, { facingLeft: false });
    const left = new RecordingHaggisContext();
    drawBothyHaggis(left, 100, 100, 1, { facingLeft: true });
    expect(left.calls.length).toBe(right.calls.length);
  });
});
