import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrowserLaunchNavigator } from './browser-navigator';

describe('createBrowserLaunchNavigator', () => {
  let assignMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    assignMock = vi.fn();
    vi.stubGlobal('window', { location: { assign: assignMock } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls window.location.assign with the target URL', () => {
    const nav = createBrowserLaunchNavigator();
    nav.navigate('https://example.com/', 'external-url');
    expect(assignMock).toHaveBeenCalledWith('https://example.com/');
  });

  it('calls window.location.assign for route targets too', () => {
    const nav = createBrowserLaunchNavigator();
    nav.navigate('/play', 'route');
    expect(assignMock).toHaveBeenCalledWith('/play');
  });
});
