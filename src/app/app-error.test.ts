import { describe, expect, it, vi } from 'vitest';
import type { LaunchPlan } from '../navigation/launch';

// Mock createDirectPlayPlan to simulate a registry state where the direct-play
// target is absent — exercises the throw on app.ts line 22.
vi.mock('../navigation/launch', async (importOriginal) => {
  const original = await importOriginal<typeof import('../navigation/launch')>();
  const plan: LaunchPlan = {
    kind: 'missing-game',
    gameId: 'wild-haggis-survivors',
    reason: 'Game is not registered',
  };
  return { ...original, createDirectPlayPlan: () => plan };
});

describe('createAppModel (direct play unavailable)', () => {
  it('throws when the direct play target is not launchable', async () => {
    const { createAppModel } = await import('./app');
    expect(() => createAppModel()).toThrow('Direct play target is unavailable');
  });
});
