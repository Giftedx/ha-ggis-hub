import { describe, it, expect } from 'vitest';
import { makeBeamGeometry, lightZoneAt } from './palette';

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
