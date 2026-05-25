import { describe, expect, it } from 'vitest';
import { drawBothyHaggis, BOTHY_HAGGIS_PALETTE } from './bothy-haggis';

class RecordingHaggisContext {
  readonly calls: string[] = [];
  private currentFillStyle: string | CanvasGradient | CanvasPattern = '';
  strokeStyle: string | CanvasGradient | CanvasPattern = '';
  lineWidth = 0;
  globalAlpha = 1;

  get fillStyle(): string | CanvasGradient | CanvasPattern {
    return this.currentFillStyle;
  }
  set fillStyle(value: string | CanvasGradient | CanvasPattern) {
    this.currentFillStyle = value;
    if (typeof value === 'string') {
      this.calls.push(`fillStyle:${value}`);
    }
  }
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
  it('renders the food-shaped Wee Chieftain without throwing on empty frame', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 1, {});
    // Squat pudding body, casing seam, knot, oat flecks, cream eyes,
    // tartan/twine collar, legs, and heather patch.
    expect(ctx.calls.length).toBeGreaterThan(55);
  });

  it('draws a wider-than-tall haggis pudding body as the primary silhouette', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 1, {});
    expect(ctx.calls).toContain('ellipse:100,101,25,15');
    expect(ctx.calls).toContain('ellipse:100,100,22,12.5');
  });

  it('uses food-mascot colours: casing, oat flecks, cream eyes, and restrained twine', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 1, {});
    expect(ctx.calls).toContain(`fillStyle:${BOTHY_HAGGIS_PALETTE.casingMid}`);
    expect(ctx.calls).toContain(`fillStyle:${BOTHY_HAGGIS_PALETTE.oatFleck}`);
    expect(ctx.calls).toContain(`fillStyle:${BOTHY_HAGGIS_PALETTE.eyeWhite}`);
    expect(ctx.calls).toContain(`fillStyle:${BOTHY_HAGGIS_PALETTE.twine}`);
  });

  it('avoids symmetric side blobs that read as ears or headphones', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 1, {});
    expect(ctx.calls).not.toContain('ellipse:75,101,4.2,6');
    expect(ctx.calls).not.toContain('ellipse:125,100.5,4.6,6.4');
    expect(ctx.calls).toContain('ellipse:123,104,2.4,3.5');
  });

  it('uses an off-centre oat patch and twine collar instead of hair, a mouth-strip, or a price tag', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 1, {});
    expect(ctx.calls).toContain('ellipse:85,96.5,4.3,1.8');
    expect(ctx.calls).not.toContain('ellipse:82,100.5,5.1,2.3');
    expect(ctx.calls).not.toContain('ellipse:84,96,5.4,2.4');
    expect(ctx.calls).not.toContain('ellipse:100,108.2,17,1.4');
    expect(ctx.calls).not.toContain('moveTo:87,106');
    expect(ctx.calls).not.toContain('moveTo:114,106');
    expect(ctx.calls).not.toContain('lineTo:121,109.5');
    expect(ctx.calls).toContain('fillRect:120.2,99.1,1.15,8');
    expect(ctx.calls).toContain('fillRect:122.6,100.2,0.9,6.2');
  });

  it('gives the eyes a directed look instead of a vacant centred stare', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 1, {});
    expect(ctx.calls).not.toContain('arc:93.9,98.1,1.55');
    expect(ctx.calls).not.toContain('arc:109.4,98.1,1.55');
    expect(ctx.calls).toContain('arc:94.4,98,1.5');
    expect(ctx.calls).toContain('arc:109.9,98,1.5');
    expect(ctx.calls).toContain('quadraticCurveTo:92.8,95.8,96.4,96.5');
    expect(ctx.calls).toContain('quadraticCurveTo:108.6,95.8,112,96.5');
  });

  it('rounds the tiny feet so the haggis does not stand on table legs', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 1, {});
    expect(ctx.calls).toContain('ellipse:86,118,3.2,1.1');
    expect(ctx.calls).toContain('ellipse:115,117.2,2.7,1');
    expect(ctx.calls).toContain('ellipse:100,111.3,20,2.2');
  });

  it('applies every supported frame parameter', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 2, {
      breathY: 0.4,
      facingLeft: true,
      frontLegY: 1.5,
      backLegY: -1.5
    });
    expect(ctx.calls).toContain('ellipse:100,102.8,50,30');
    expect(ctx.calls).toContain('fillRect:125.3,119.8,5.4,11');
    expect(ctx.calls).toContain('fillRect:67.3,125.8,5.4,7.6');
  });

  it('exposes the Wee Chieftain food-mascot palette', () => {
    expect(BOTHY_HAGGIS_PALETTE.casingMid).toBe('#7a3f24');
    expect(BOTHY_HAGGIS_PALETTE.casingHighlight).toBe('#b46a38');
    expect(BOTHY_HAGGIS_PALETTE.crumbDark).toBe('#3a2a1a');
    expect(BOTHY_HAGGIS_PALETTE.oatFleck).toBe('#d8b46a');
    expect(BOTHY_HAGGIS_PALETTE.eyeWhite).toBe('#f0e6c8');
    expect(BOTHY_HAGGIS_PALETTE.eyePupil).toBe('#0a0604');
    expect(BOTHY_HAGGIS_PALETTE.twine).toBe('#c4a878');
    expect(BOTHY_HAGGIS_PALETTE.tartanRed).toBe('#9c2018');
    expect(BOTHY_HAGGIS_PALETTE.tartanGreen).toBe('#1f4628');
  });

  it('facingLeft mirrors leg drift only', () => {
    const right = new RecordingHaggisContext();
    drawBothyHaggis(right, 100, 100, 1, { facingLeft: false });
    const left = new RecordingHaggisContext();
    drawBothyHaggis(left, 100, 100, 1, { facingLeft: true });
    expect(right.calls).toContain('fillRect:84.65,111,2.7,5.5');
    expect(left.calls).toContain('fillRect:112.65,111,2.7,5.5');
    expect(left.calls).not.toContain('fillRect:84.65,111,2.7,5.5');
    expect(left.calls.length).toBe(right.calls.length);
  });
});
