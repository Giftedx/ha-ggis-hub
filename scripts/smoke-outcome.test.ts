import { describe, expect, it } from 'vitest';
import { smokeDoorLaunchExitCode } from './smoke-outcome.mjs';

const EXPECTED_WHS_URL = 'https://wild-haggis-survivors.pages.dev/';

describe('smokeDoorLaunchExitCode', () => {
  it('fails when keyboard launch produces no navigation', () => {
    expect(smokeDoorLaunchExitCode({
      errors: [],
      navigations: [],
      expectedNavigationUrl: EXPECTED_WHS_URL
    })).toBe(1);
  });

  it('fails when browser error-page navigation is the only observed navigation', () => {
    expect(smokeDoorLaunchExitCode({
      errors: [],
      navigations: ['chrome-error://chromewebdata/'],
      expectedNavigationUrl: EXPECTED_WHS_URL
    })).toBe(1);
  });

  it('fails when a navigation fires but not to the expected game URL', () => {
    expect(smokeDoorLaunchExitCode({
      errors: [],
      navigations: ['https://example.invalid/'],
      expectedNavigationUrl: EXPECTED_WHS_URL
    })).toBe(1);
  });

  it('fails when the page reports an error even if navigation was observed', () => {
    expect(smokeDoorLaunchExitCode({
      errors: ['pageerror: boom'],
      navigations: [EXPECTED_WHS_URL],
      expectedNavigationUrl: EXPECTED_WHS_URL
    })).toBe(1);
  });

  it('passes only when the expected navigation is observed and no page errors were collected', () => {
    expect(smokeDoorLaunchExitCode({
      errors: [],
      navigations: [EXPECTED_WHS_URL, 'chrome-error://chromewebdata/'],
      expectedNavigationUrl: EXPECTED_WHS_URL
    })).toBe(0);
  });

  it('passes when the expected launch URL has a route suffix', () => {
    expect(smokeDoorLaunchExitCode({
      errors: [],
      navigations: [`${EXPECTED_WHS_URL}?utm_source=hub`],
      expectedNavigationUrl: EXPECTED_WHS_URL
    })).toBe(0);
  });
});
