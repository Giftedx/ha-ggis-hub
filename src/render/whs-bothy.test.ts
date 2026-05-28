import { describe, expect, it } from 'vitest';
import { drawWhsBothyEnvelope, drawWhsDoor } from './whs-bothy';

class RecordingWhsContext {
  readonly calls: string[] = [];
  fillStyle: string | CanvasGradient | CanvasPattern = '';
  strokeStyle: string | CanvasGradient | CanvasPattern = '';
  lineWidth = 0;
  globalAlpha = 1;

  fillRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`fillRect:${x},${y},${width},${height}`);
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
  arc(x: number, y: number, radius: number): void {
    this.calls.push(`arc:${x},${y},${radius}`);
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

describe('WHS bothy fixture helpers', () => {
  it('covers walls, floor, and door rendering paths used by canvas-room', () => {
    const ctx = new RecordingWhsContext();

    drawWhsBothyEnvelope(ctx, {
      left: 24,
      right: 516,
      top: 0,
      wallBottom: 96,
      floorBottom: 336,
      compact: false,
    });
    drawWhsBothyEnvelope(ctx, {
      left: 24,
      right: 420,
      top: 0,
      wallBottom: 84,
      floorBottom: 260,
      compact: true,
    });
    drawWhsDoor(ctx, { x: 24, y: 140, w: 58, h: 70 }, 'open');
    drawWhsDoor(ctx, { x: 104, y: 140, w: 58, h: 70 }, 'locked');
    drawWhsDoor(ctx, { x: 184, y: 140, w: 58, h: 70 }, 'available');

    expect(ctx.calls.length).toBeGreaterThan(200);
    expect(ctx.calls).toContain('fillRect:24,0,492,96');
    expect(ctx.calls).toContain('fillRect:24,96,492,240');
    expect(ctx.calls).toContain('fillRect:21,136,64,76');
    expect(ctx.calls).toContain('fillRect:101,136,64,76');
    expect(ctx.calls).toContain('fillRect:181,136,64,76');
  });
});
