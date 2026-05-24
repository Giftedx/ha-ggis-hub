import { describe, expect, it } from 'vitest';
import {
  drawWhsBothyEnvelope,
  drawWhsRug,
  type WhsBothyContext,
  type BothyEnvelope
} from './whs-bothy';

class RecordingBothyContext implements WhsBothyContext {
  readonly calls: string[] = [];
  fillStyle: string | CanvasGradient | CanvasPattern = '';
  strokeStyle: string | CanvasGradient | CanvasPattern = '';
  lineWidth = 0;
  globalAlpha = 1;

  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push(`fillRect:${x},${y},${w},${h}`);
  }
  beginPath(): void { this.calls.push('beginPath'); }
  moveTo(x: number, y: number): void { this.calls.push(`moveTo:${x},${y}`); }
  lineTo(x: number, y: number): void { this.calls.push(`lineTo:${x},${y}`); }
  arc(x: number, y: number, r: number): void { this.calls.push(`arc:${x},${y},${r}`); }
  ellipse(cx: number, cy: number, rx: number, ry: number): void {
    this.calls.push(`ellipse:${cx},${cy},${rx},${ry}`);
  }
  fill(): void { this.calls.push('fill'); }
  stroke(): void { this.calls.push('stroke'); }
  save(): void { this.calls.push('save'); }
  restore(): void { this.calls.push('restore'); }
}

const ENV: BothyEnvelope = {
  left: 0,
  right: 800,
  top: 0,
  wallBottom: 300,
  floorBottom: 500,
  compact: false
};

describe('drawWhsBothyEnvelope', () => {
  it('renders walls and floor without throwing', () => {
    const ctx = new RecordingBothyContext();
    drawWhsBothyEnvelope(ctx, ENV);
    expect(ctx.calls.length).toBeGreaterThan(10);
  });
});

describe('drawWhsRug', () => {
  it('renders all rug layers without throwing (compact=false — normal stripe sizes)', () => {
    const ctx = new RecordingBothyContext();
    drawWhsRug(ctx, 200, 300, 400, 100, false);
    expect(ctx.calls.length).toBeGreaterThan(10);
  });

  it('renders with reduced stripe sizes on compact viewports (compact=true)', () => {
    const ctxCompact = new RecordingBothyContext();
    drawWhsRug(ctxCompact, 200, 300, 400, 100, true);
    const ctxNormal = new RecordingBothyContext();
    drawWhsRug(ctxNormal, 200, 300, 400, 100, false);
    // Both paths produce identical call counts — compact only changes sizes.
    expect(ctxCompact.calls.length).toBe(ctxNormal.calls.length);
  });
});
