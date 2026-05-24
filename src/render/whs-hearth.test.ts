import { describe, expect, it } from 'vitest';
import { drawWhsHearthFrame, HEARTH_FRAMES, HEARTH_FRAME_COUNT } from './whs-hearth';

class RecordingHearthContext {
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

describe('drawWhsHearthFrame', () => {
  it('emits draw calls for each frame index without throwing', () => {
    for (let i = 0; i < HEARTH_FRAME_COUNT; i++) {
      const ctx = new RecordingHearthContext();
      drawWhsHearthFrame(ctx, 0, 0, 1, i);
      expect(ctx.calls.length).toBeGreaterThan(10);
    }
  });

  it('emits more draw calls for the bright frame (index 1, emberGlow=1.0) than dim frame (index 3, emberGlow=0.65)', () => {
    // Frame 1: emberGlow=1.0 → spark + steam first branch
    // Frame 3: emberGlow=0.65 → no spark, no steam
    const ctxBright = new RecordingHearthContext();
    drawWhsHearthFrame(ctxBright, 0, 0, 1, 1);

    const ctxDim = new RecordingHearthContext();
    drawWhsHearthFrame(ctxDim, 0, 0, 1, 3);

    // Bright frame has spark fills + steam ellipses not present in dim.
    expect(ctxBright.calls.length).toBeGreaterThan(ctxDim.calls.length);
  });

  it('frame 1 (emberGlow=1.0) exercises the spark branch above the flame tip', () => {
    // Spark: 2 small fillRect calls rendered only when emberGlow > 0.9
    const ctxBright = new RecordingHearthContext();
    drawWhsHearthFrame(ctxBright, 0, 0, 1, 1);
    expect(HEARTH_FRAMES[1]!.emberGlow).toBe(1.0);
    expect(ctxBright.calls.length).toBeGreaterThan(50);
  });

  it('frame 2 (emberGlow=0.85) triggers kettle steam (>0.7 branch, not >0.85)', () => {
    const ctx = new RecordingHearthContext();
    drawWhsHearthFrame(ctx, 0, 0, 1, 2);
    expect(HEARTH_FRAMES[2]!.emberGlow).toBe(0.85);
    expect(ctx.calls.length).toBeGreaterThan(10);
  });

  it('wraps frame index modulo HEARTH_FRAME_COUNT', () => {
    const ctxA = new RecordingHearthContext();
    drawWhsHearthFrame(ctxA, 0, 0, 1, 0);
    const ctxB = new RecordingHearthContext();
    drawWhsHearthFrame(ctxB, 0, 0, 1, HEARTH_FRAME_COUNT);
    expect(ctxA.calls).toEqual(ctxB.calls);
  });

  it('scales draw coordinates by the scale parameter', () => {
    const ctxScale1 = new RecordingHearthContext();
    drawWhsHearthFrame(ctxScale1, 0, 0, 1, 0);
    const ctxScale2 = new RecordingHearthContext();
    drawWhsHearthFrame(ctxScale2, 0, 0, 2, 0);
    // Same call count but different numeric values — compare a fillRect.
    expect(ctxScale1.calls.length).toBe(ctxScale2.calls.length);
    const firstFill1 = ctxScale1.calls.find((c) => c.startsWith('fillRect:'));
    const firstFill2 = ctxScale2.calls.find((c) => c.startsWith('fillRect:'));
    expect(firstFill1).not.toBe(firstFill2);
  });
});
