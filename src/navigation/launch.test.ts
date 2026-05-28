import { describe, expect, it, vi } from 'vitest';
import { canLaunchGame, createDirectPlayPlan, createLaunchPlan, performLaunch } from './launch';
import { HUB_GAME_REGISTRY } from '../games/registry';

describe('launch planning', () => {
  it('creates a route launch plan for the canonical direct-play Wild Haggis Survivors entry', () => {
    expect(createDirectPlayPlan(HUB_GAME_REGISTRY)).toEqual({
      kind: 'launchable',
      gameId: 'wild-haggis-survivors',
      title: 'Wild Haggis Survivors',
      target: '/wild/',
      targetKind: 'route',
    });
  });

  it('creates external launch plans and rejects coming-soon games without browser side effects', () => {
    expect(
      createLaunchPlan({
        id: 'external-game',
        title: 'External Game',
        status: 'playable',
        launch: { kind: 'external-url', target: 'https://example.com/game/' },
      })
    ).toEqual({
      kind: 'launchable',
      gameId: 'external-game',
      title: 'External Game',
      target: 'https://example.com/game/',
      targetKind: 'external-url',
    });

    const future = HUB_GAME_REGISTRY.find((game) => game.id === 'future-bothy');
    expect(future).toBeDefined();
    expect(future === undefined ? undefined : createLaunchPlan(future)).toEqual({
      kind: 'unavailable',
      gameId: 'future-bothy',
      title: "Comin' Wi' The Next Moon",
      reason: 'coming-soon',
    });
  });

  it('reports whether games can launch', () => {
    expect(canLaunchGame(HUB_GAME_REGISTRY[0])).toBe(true);
    expect(canLaunchGame(HUB_GAME_REGISTRY[1])).toBe(false);
  });

  it('returns a controlled missing-game plan when direct play target is absent', () => {
    expect(createDirectPlayPlan([])).toEqual({
      kind: 'missing-game',
      gameId: 'wild-haggis-survivors',
      reason: 'Game is not registered',
    });
  });

  it('fails closed for unsafe launch targets', () => {
    expect(
      createLaunchPlan({
        id: 'unsafe',
        title: 'Unsafe',
        status: 'playable',
        launch: { kind: 'external-url', target: 'javascript:alert(1)' },
      })
    ).toEqual({
      kind: 'unavailable',
      gameId: 'unsafe',
      title: 'Unsafe',
      reason: 'unsafe: External launch target must use https: javascript:alert(1)',
    });
  });

  it('performs browser navigation only for launchable plans', () => {
    const navigate = vi.fn();

    performLaunch(createDirectPlayPlan(HUB_GAME_REGISTRY), { navigate });
    performLaunch({ kind: 'missing-game', gameId: 'missing', reason: 'missing' }, { navigate });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/wild/', 'route');
  });

  it('passes route target kind through to the navigator', () => {
    const navigate = vi.fn();
    performLaunch(
      createLaunchPlan({
        id: 'mounted-game',
        title: 'Mounted Game',
        status: 'playable',
        launch: { kind: 'route', target: '/wild-haggis-survivors/' },
      }),
      { navigate }
    );
    expect(navigate).toHaveBeenCalledWith('/wild-haggis-survivors/', 'route');
  });
});
