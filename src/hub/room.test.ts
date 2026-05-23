import { describe, expect, it, vi } from 'vitest';
import { createHubRoomController, DEFAULT_HUB_ROOM_DOORS } from './room';
import type { HubCoreWorld, HubPlayerState } from '../wasm/boundary';

describe('createHubRoomController', () => {
  it('advances player state through the hub core and renders the resulting room snapshot', () => {
    const initialPlayer: HubPlayerState = { x: 500, y: 500, halfExtent: 80, speedPerTick: 100 };
    const nextPlayer: HubPlayerState = { x: 600, y: 500, halfExtent: 80, speedPerTick: 100 };
    const world: HubCoreWorld = {
      tickPlayer: vi.fn(() => nextPlayer),
      interactionFor: vi.fn(() => ({ kind: 'launchable' as const, id: 'wild-haggis-survivors', title: 'Wild Haggis Survivors' }))
    };
    const render = vi.fn();
    const controller = createHubRoomController({
      world,
      doors: DEFAULT_HUB_ROOM_DOORS,
      renderer: { render },
      input: { snapshot: () => ({ x: 1, y: 0 }) },
      initialPlayer
    });

    controller.tick();

    expect(world.tickPlayer).toHaveBeenCalledWith(initialPlayer, { x: 1, y: 0 });
    expect(world.interactionFor).toHaveBeenCalledWith(nextPlayer);
    expect(controller.player()).toEqual(nextPlayer);
    expect(render).toHaveBeenCalledWith({
      world: { width: 1_000, height: 1_000 },
      player: nextPlayer,
      doors: DEFAULT_HUB_ROOM_DOORS,
      interaction: { kind: 'launchable', id: 'wild-haggis-survivors', title: 'Wild Haggis Survivors' }
    });
  });

  it('renders a no-interaction initial frame before movement starts', () => {
    const initialPlayer: HubPlayerState = { x: 500, y: 500, halfExtent: 80, speedPerTick: 100 };
    const render = vi.fn();
    const controller = createHubRoomController({
      world: {
        tickPlayer: vi.fn(),
        interactionFor: vi.fn(() => ({ kind: 'none' as const, id: '', title: '' }))
      },
      doors: DEFAULT_HUB_ROOM_DOORS,
      renderer: { render },
      input: { snapshot: () => ({ x: 0, y: 0 }) },
      initialPlayer
    });

    controller.render();

    expect(render).toHaveBeenCalledWith({
      world: { width: 1_000, height: 1_000 },
      player: initialPlayer,
      doors: DEFAULT_HUB_ROOM_DOORS,
      interaction: { kind: 'none', id: '', title: '' }
    });
  });
});
