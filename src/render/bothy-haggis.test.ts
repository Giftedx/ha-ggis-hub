import { readFileSync } from 'node:fs';
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
    // Squat pudding body, casing seams, oat flecks, cream eyes, legs, and heather patch.
    expect(ctx.calls.length).toBeGreaterThan(55);
  });

  it('draws a wider-than-tall haggis pudding body as the primary silhouette', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 1, {});
    expect(ctx.calls).toContain('ellipse:100,101,25,15');
    expect(ctx.calls).toContain('ellipse:100,100,22,12.5');
    expect(ctx.calls).toContain('ellipse:79.2,101.8,2.1,6.2');
    expect(ctx.calls).toContain('ellipse:121.2,101.6,2.4,6.8');
  });

  it('uses food-mascot colours: casing, oat flecks, and cream eyes', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 1, {});
    expect(ctx.calls).toContain(`fillStyle:${BOTHY_HAGGIS_PALETTE.casingMid}`);
    expect(ctx.calls).toContain(`fillStyle:${BOTHY_HAGGIS_PALETTE.oatFleck}`);
    expect(ctx.calls).toContain(`fillStyle:${BOTHY_HAGGIS_PALETTE.eyeWhite}`);
  });

  it('avoids symmetric side blobs that read as ears or headphones', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 1, {});
    expect(ctx.calls).not.toContain('ellipse:75,101,4.2,6');
    expect(ctx.calls).not.toContain('ellipse:125,100.5,4.6,6.4');
    expect(ctx.calls).not.toContain('ellipse:123,104,2.4,3.5');
  });

  it('does not render an oat cutaway or tied casing knot', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 1, {});
    expect(ctx.calls).not.toContain(`fillStyle:${BOTHY_HAGGIS_PALETTE.crumbLight}`);
    expect(ctx.calls).not.toContain(`fillStyle:${BOTHY_HAGGIS_PALETTE.twine}`);
    expect(ctx.calls).not.toContain('ellipse:123,104,2.4,3.5');
    expect(ctx.calls).not.toContain('fillRect:120.2,99.1,1.15,8');
    expect(ctx.calls).not.toContain('fillRect:122.6,100.2,0.9,6.2');
    expect(ctx.calls).not.toContain('arc:121.65,101.6,1.15');
    expect(ctx.calls).not.toContain('arc:124.2,102.8,1.15');
    expect(ctx.calls).not.toContain('quadraticCurveTo:124.4,101.1,125.4,103.2');
    expect(ctx.calls).not.toContain('moveTo:80.8,102');
    expect(ctx.calls).not.toContain('quadraticCurveTo:84.1,98.6,90.8,101');
    expect(ctx.calls).not.toContain('arc:84.2,102.6,0.95');
    expect(ctx.calls).not.toContain('arc:87.2,104.8,1.05');
    expect(ctx.calls).not.toContain('arc:90.2,101.9,0.85');
  });

  it('gives the eyes an alert directed look instead of a vacant or sleepy stare', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 1, {});
    expect(ctx.calls).not.toContain('arc:92.8,97.5,3.4');
    expect(ctx.calls).not.toContain('arc:108.3,97.5,3.4');
    expect(ctx.calls).toContain('arc:93.8,97.7,4');
    expect(ctx.calls).toContain('arc:107.2,97.7,4');
    expect(ctx.calls).toContain('arc:94.5,97.65,2.2');
    expect(ctx.calls).toContain('arc:106.4,97.65,2.2');
  });

  it('adds an authored brow line so the mascot reads alive rather than blank', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 1, {});
    expect(ctx.calls).toContain('moveTo:89,92.5');
    expect(ctx.calls).toContain('quadraticCurveTo:93,90.5,97,92.5');
    expect(ctx.calls).toContain('moveTo:103,92.5');
    expect(ctx.calls).toContain('quadraticCurveTo:107,90.5,111,92.5');
  });

  it('adds casing eyelids so the mascot expression reads authored instead of googly', () => {
    const ctx = new RecordingHaggisContext();
    drawBothyHaggis(ctx, 100, 100, 1, {});
    expect(ctx.calls).toContain('ellipse:93.8,96,4.2,1.2');
    expect(ctx.calls).toContain('ellipse:107.2,96,4.2,1.2');
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
      backLegY: -1.5,
    });
    expect(ctx.calls).toContain('ellipse:100,102.8,50,30');
    expect(ctx.calls).toContain('fillRect:125.3,119.8,5.4,11');
    expect(ctx.calls).toContain('fillRect:67.3,125.8,5.4,7.6');
  });

  it('exposes the Wee Chieftain food-mascot palette', () => {
    expect(BOTHY_HAGGIS_PALETTE.casingMid).toBe('#7a3f24');
    expect(BOTHY_HAGGIS_PALETTE.casingHighlight).toBe('#b46a38');
    expect(BOTHY_HAGGIS_PALETTE.crumbLight).toBe('#f4d8a0');
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

describe('favicon.svg', () => {
  it('uses a close-cropped haggis icon instead of shrinking the full walking mascot', () => {
    const svg = readFileSync(new URL('../../public/favicon.svg', import.meta.url), 'utf8');
    expect(svg).toContain('close-cropped Wee Chieftain mark');
    expect(svg).toContain('<ellipse cx="15.6" cy="17.2" rx="14" ry="9.8"');
    expect(svg).toContain('M 3.9,13.7 Q 5.8,12.2 9.7,13.4');
    expect(svg).toContain('Q 7.0,12.9 9.6,14.1');
    expect(svg).toContain('<circle cx="5.8" cy="14.1" r="0.52"');
    expect(svg).not.toContain('Q 7.9,12.9 12.0,14.1');
    expect(svg).not.toContain('Q 7.2,12.9 10.8,14.1');
    expect(svg).not.toContain('<ellipse cx="8.1" cy="14.7" rx="2.35"');
    expect(svg).toContain('<circle cx="25.9" cy="17.8" r="0.66"');
    expect(svg).toContain('fill="#f0e6c8"');
    expect(svg).not.toContain('<rect x="9.2" y="24"');
    expect(svg).not.toContain('<rect x="12.6" y="24"');
    expect(svg).not.toContain('<ellipse cx="16" cy="27.2"');
  });
});
