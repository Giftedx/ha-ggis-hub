import { describe, it, expect } from 'vitest';
import {
  makeBeamGeometry,
  lightZoneAt,
  ditheredBloom,
  ditheredBloomBiased,
  ditheredAlphaMask,
  radialEllipseAlpha,
  ditherZoneInternal,
  ditherBoundary,
  type HardPixelContext,
} from './palette';

// ---------------------------------------------------------------------------
// Mock context — records fillRect calls and the style active at call time.
// ---------------------------------------------------------------------------
interface PaintCall { x: number; y: number; w: number; h: number; style: string }

function makeMockCtx(): { ctx: HardPixelContext; calls: PaintCall[] } {
  const calls: PaintCall[] = [];
  let style = '';
  const ctx = {
    get fillStyle() { return style; },
    set fillStyle(s: string | CanvasGradient | CanvasPattern) { style = s as string; },
    fillRect(x: number, y: number, w: number, h: number): void { calls.push({ x, y, w, h, style }); },
  };
  return { ctx, calls };
}

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
// ditheredBloom
// ---------------------------------------------------------------------------
describe('ditheredBloom', () => {
  it('sets fillStyle to the given colour', () => {
    const { ctx, calls } = makeMockCtx();
    ditheredBloom(ctx, 10, 10, 3, '#ff0000', 1);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]!.style).toBe('#ff0000');
  });

  it('all painted pixels are within the radius (d2 <= r2)', () => {
    const { ctx, calls } = makeMockCtx();
    const cx = 20; const cy = 20; const r = 5;
    ditheredBloom(ctx, cx, cy, r, '#fff', 1);
    for (const c of calls) {
      const dx = c.x - cx; const dy = c.y - cy;
      expect(dx * dx + dy * dy).toBeLessThanOrEqual(r * r + 1);
    }
  });

  it('density=1 paints more pixels than density=0', () => {
    const { ctx: ctxFull, calls: callsFull } = makeMockCtx();
    const { ctx: ctxNone, calls: callsNone } = makeMockCtx();
    ditheredBloom(ctxFull, 0, 0, 8, '#fff', 1);
    ditheredBloom(ctxNone, 0, 0, 8, '#fff', 0);
    expect(callsFull.length).toBeGreaterThan(callsNone.length);
  });

  it('radius=0 paints nothing', () => {
    const { ctx, calls } = makeMockCtx();
    ditheredBloom(ctx, 10, 10, 0, '#fff', 1);
    expect(calls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ditheredBloomBiased
// ---------------------------------------------------------------------------
describe('ditheredBloomBiased', () => {
  it('sets fillStyle to the given colour', () => {
    const { ctx, calls } = makeMockCtx();
    ditheredBloomBiased(ctx, 10, 10, 5, 1, 0, '#ff0', 1);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]!.style).toBe('#ff0');
  });

  it('all painted pixels are within the radius', () => {
    const { ctx, calls } = makeMockCtx();
    const cx = 20; const cy = 20; const r = 6;
    ditheredBloomBiased(ctx, cx, cy, r, 0, 0, '#fff', 1);
    for (const c of calls) {
      const dx = c.x - cx; const dy = c.y - cy;
      // Allow 1-pixel slack for 2×2 clusters that anchor inside but extend outside
      expect(Math.abs(dx)).toBeLessThanOrEqual(r + 1);
      expect(Math.abs(dy)).toBeLessThanOrEqual(r + 1);
    }
  });

  it('inner core pixels use 1×1 paint (isOuter=false path)', () => {
    const { ctx, calls } = makeMockCtx();
    // radius=3: d2 < 0.45*r2 means t < 0.45 (inner), so small radius hits inner core
    ditheredBloomBiased(ctx, 0, 0, 3, 0, 0, '#fff', 1);
    const singleCalls = calls.filter(c => c.w === 1);
    expect(singleCalls.length).toBeGreaterThan(0);
  });

  it('outer ring pixels use 2×2 clusters (isOuter=true path)', () => {
    const { ctx, calls } = makeMockCtx();
    // radius=8: outer ring exists beyond innerRingT=0.45
    ditheredBloomBiased(ctx, 0, 0, 8, 0, 0, '#fff', 1);
    const clusterCalls = calls.filter(c => c.w === 2);
    expect(clusterCalls.length).toBeGreaterThan(0);
  });

  it('density=1 paints more than density=0', () => {
    const { ctx: ctxFull, calls: callsFull } = makeMockCtx();
    const { ctx: ctxNone, calls: callsNone } = makeMockCtx();
    ditheredBloomBiased(ctxFull, 0, 0, 8, 1, 0, '#fff', 1);
    ditheredBloomBiased(ctxNone, 0, 0, 8, 1, 0, '#fff', 0);
    expect(callsFull.length).toBeGreaterThan(callsNone.length);
  });

  it('yStretch > 1 extends reach vertically', () => {
    const { ctx: ctxNorm, calls: callsNorm } = makeMockCtx();
    const { ctx: ctxStretch, calls: callsStretch } = makeMockCtx();
    ditheredBloomBiased(ctxNorm, 0, 0, 8, 0, 0, '#fff', 1, 1);
    ditheredBloomBiased(ctxStretch, 0, 0, 8, 0, 0, '#fff', 1, 2);
    // Stretched version should paint more pixels overall
    expect(callsStretch.length).toBeGreaterThanOrEqual(callsNorm.length);
  });
});

// ---------------------------------------------------------------------------
// ditheredAlphaMask
// ---------------------------------------------------------------------------
describe('ditheredAlphaMask', () => {
  it('sets fillStyle to the given colour', () => {
    const { ctx, calls } = makeMockCtx();
    ditheredAlphaMask(ctx, 10, 10, { halfW: 3, halfH: 3 }, '#abc', () => 1);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]!.style).toBe('#abc');
  });

  it('alphaFn returning 0 everywhere produces no paint calls', () => {
    const { ctx, calls } = makeMockCtx();
    ditheredAlphaMask(ctx, 10, 10, { halfW: 5, halfH: 5 }, '#fff', () => 0);
    expect(calls.length).toBe(0);
  });

  it('alphaFn returning 1 everywhere paints most pixels in the bbox', () => {
    const { ctx, calls } = makeMockCtx();
    // bbox is 11×11 = 121 pixels; with alpha=1 nearly all should be painted
    ditheredAlphaMask(ctx, 4, 4, { halfW: 5, halfH: 5 }, '#fff', () => 1);
    expect(calls.length).toBeGreaterThan(50);
  });

  it('low alpha (< 0.35) produces 2×2 clusters (w=2 paint calls)', () => {
    const { ctx, calls } = makeMockCtx();
    // alpha=0.2 → low-alpha path → 2×2 fillRect
    ditheredAlphaMask(ctx, 0, 0, { halfW: 5, halfH: 5 }, '#fff', () => 0.2);
    const clusterCalls = calls.filter(c => c.w === 2);
    expect(clusterCalls.length).toBeGreaterThan(0);
  });

  it('high alpha (>= 0.35) produces 1×1 paint calls', () => {
    const { ctx, calls } = makeMockCtx();
    ditheredAlphaMask(ctx, 0, 0, { halfW: 3, halfH: 3 }, '#fff', () => 0.8);
    const singleCalls = calls.filter(c => c.w === 1);
    expect(singleCalls.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// radialEllipseAlpha (pure function — no ctx)
// ---------------------------------------------------------------------------
describe('radialEllipseAlpha', () => {
  const fn = radialEllipseAlpha(10, 1, 0, 0, 0, 0.35);

  it('returns 0 outside radius', () => {
    expect(fn(15, 0)).toBe(0);
    expect(fn(0, 15)).toBe(0);
  });

  it('returns 1 at centre (plateau zone)', () => {
    expect(fn(0, 0)).toBe(1);
  });

  it('returns 1 just inside plateau boundary', () => {
    // plateau = 0.35, so t < 0.35 → alpha = 1. d = 3 → t = 0.3
    expect(fn(3, 0)).toBe(1);
  });

  it('returns value in (0,1) in the transition band', () => {
    // d = 8 → t = 0.8 → in smoothstep transition
    const a = fn(8, 0);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(1);
  });

  it('bias shifts alpha values with biasStrength > 0', () => {
    const fnBiased = radialEllipseAlpha(10, 1, 1, 0, 0.5, 0.35);
    // Along the bias direction (dx>0) alpha should be higher
    const aWith  = fnBiased(5, 0);  // along bias
    const aAgainst = fnBiased(-5, 0); // against bias
    expect(aWith).toBeGreaterThanOrEqual(aAgainst);
  });

  it('yStretch > 1 extends reach along y axis', () => {
    const fnStretched = radialEllipseAlpha(10, 2, 0, 0, 0, 0.35);
    const fnNormal = radialEllipseAlpha(10, 1, 0, 0, 0, 0.35);
    // At dy=6: without stretch d=6, t=0.6 (transition zone, alpha<1).
    // With yStretch=2: dyEff=3, d=3, t=0.3 (plateau zone, alpha=1).
    expect(fnStretched(0, 6)).toBe(1);
    expect(fnNormal(0, 6)).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// ditherZoneInternal
// ---------------------------------------------------------------------------
describe('ditherZoneInternal', () => {
  it('skips pixels where predicate returns false', () => {
    const { ctx, calls } = makeMockCtx();
    ditherZoneInternal(
      ctx,
      { x: 0, y: 0, w: 5, h: 5 },
      () => false,
      '#fff', '#000', 8
    );
    expect(calls.length).toBe(0);
  });

  it('paints pixels where predicate returns true', () => {
    const { ctx, calls } = makeMockCtx();
    ditherZoneInternal(
      ctx,
      { x: 0, y: 0, w: 4, h: 4 },
      () => true,
      '#fff', '#000', 8
    );
    expect(calls.length).toBe(16); // 4×4 = 16 pixels
  });

  it('uses light colour when bayerVal < threshold', () => {
    const { ctx, calls } = makeMockCtx();
    // threshold=16 → all bayer values (0..15) are < 16 → always use colourLight
    ditherZoneInternal(
      ctx,
      { x: 0, y: 0, w: 4, h: 4 },
      () => true,
      '#light', '#dark', 16
    );
    expect(calls.every(c => c.style === '#light')).toBe(true);
  });

  it('uses dark colour when bayerVal >= threshold', () => {
    const { ctx, calls } = makeMockCtx();
    // threshold=0 → no bayer value (0..15) is < 0 → always use colourDark
    ditherZoneInternal(
      ctx,
      { x: 0, y: 0, w: 4, h: 4 },
      () => true,
      '#light', '#dark', 0
    );
    expect(calls.every(c => c.style === '#dark')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ditherBoundary
// ---------------------------------------------------------------------------
describe('ditherBoundary', () => {
  it('paints no pixels when points list is empty', () => {
    const { ctx, calls } = makeMockCtx();
    ditherBoundary(ctx, [], 3, '#fff', 1);
    expect(calls.length).toBe(0);
  });

  it('sets fillStyle to the given colour', () => {
    const { ctx, calls } = makeMockCtx();
    ditherBoundary(ctx, [[10, 10]], 2, '#pink', 1);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]!.style).toBe('#pink');
  });

  it('with density=1 paints pixels around each boundary point', () => {
    const { ctx, calls } = makeMockCtx();
    ditherBoundary(ctx, [[0, 0]], 4, '#fff', 1);
    expect(calls.length).toBeGreaterThan(0);
  });

  it('all painted pixels are within thickness of the boundary point', () => {
    const { ctx, calls } = makeMockCtx();
    const px = 20; const py = 20; const t = 3;
    ditherBoundary(ctx, [[px, py]], t, '#fff', 1);
    for (const c of calls) {
      const dx = c.x - px; const dy = c.y - py;
      expect(dx * dx + dy * dy).toBeLessThanOrEqual(t * t + 1);
    }
  });
});
