import { describe, expect, it } from 'vitest';
import { CHAP_RETORTS, chapRetortAt } from './chap';

describe('chapRetortAt', () => {
  it('returns the first retort for index 0', () => {
    expect(chapRetortAt(0)).toBe(CHAP_RETORTS[0]);
  });

  it('advances one retort per index', () => {
    expect(chapRetortAt(1)).toBe(CHAP_RETORTS[1]);
    expect(chapRetortAt(2)).toBe(CHAP_RETORTS[2]);
  });

  it('wraps back to the start once the table is exhausted', () => {
    expect(chapRetortAt(CHAP_RETORTS.length)).toBe(CHAP_RETORTS[0]);
    expect(chapRetortAt(CHAP_RETORTS.length + 1)).toBe(CHAP_RETORTS[1]);
  });
});

describe('CHAP_RETORTS table', () => {
  it('offers more than one retort so repeated chaps feel alive', () => {
    expect(CHAP_RETORTS.length).toBeGreaterThan(1);
  });

  it('pairs an uppercase canvas sign with a fuller spoken status line for every retort', () => {
    for (const retort of CHAP_RETORTS) {
      expect(retort.sign).toBe(retort.sign.toUpperCase());
      expect(retort.spoken.length).toBeGreaterThan(0);
      // The spoken status line is a fuller sentence than the terse canvas sign.
      expect(retort.spoken.length).toBeGreaterThan(retort.sign.length);
    }
  });

  it('keeps every canvas sign within the pixel-font charset and prompt width budget', () => {
    for (const retort of CHAP_RETORTS) {
      // Pixel-font signage is single-case A-Z plus space, apostrophe, period
      // (the launchable prompt proves these glyphs render). No commas/dashes.
      expect(retort.sign).toMatch(/^[A-Z '.]+$/);
      // "ENTER SPACE E TAP" (17 glyphs) ships and fits the 540px prompt at
      // scale 2; keep chap signs no wider than that proven bound.
      expect(retort.sign.length).toBeLessThanOrEqual(17);
    }
  });

  it('never reuses the passive COMIN SOON line as a chap sign so a chap always reads as a response', () => {
    for (const retort of CHAP_RETORTS) {
      expect(retort.sign).not.toBe("COMIN' SOON.");
    }
  });
});
