import { describe, expect, it, vi } from 'vitest';
import { initializeHubCore } from './boundary';

describe('initializeHubCore', () => {
  it('initializes a generated WASM module and exposes identity plus demo world', async () => {
    const playerSnapshotFree = vi.fn();
    const interactionSnapshotFree = vi.fn();
    const tickPlayer = vi.fn(() => ({
      x: () => 500,
      y: () => 500,
      half_extent: () => 0,
      speed_per_tick: () => 0,
      free: playerSnapshotFree
    }));
    const interactionFor = vi.fn(() => ({
      kind: () => 0,
      id: () => '',
      title: () => '',
      free: interactionSnapshotFree
    }));

    const module = await initializeHubCore(async () => ({
      hub_core_api_version: () => 1,
      hub_core_project_name: () => 'ha.ggis Hub',
      create_demo_world: () => ({
        tick_player: tickPlayer,
        interaction_for: interactionFor
      })
    }));

    expect(module.identity).toEqual({ projectName: 'ha.ggis Hub', apiVersion: 1 });
    expect(module.world.tickPlayer({ x: 500, y: 500, halfExtent: -80, speedPerTick: -100 }, { x: 42, y: -42 })).toEqual({
      x: 500,
      y: 500,
      halfExtent: 0,
      speedPerTick: 0
    });
    expect(tickPlayer).toHaveBeenCalledWith(500, 500, -80, -100, 42, -42);
    expect(playerSnapshotFree).toHaveBeenCalledOnce();

    expect(module.world.interactionFor({ x: 500, y: 500, halfExtent: 0, speedPerTick: 0 })).toEqual({
      kind: 'none',
      id: '',
      title: ''
    });
    expect(interactionFor).toHaveBeenCalledWith(500, 500, 0, 0);
    expect(interactionSnapshotFree).toHaveBeenCalledOnce();
  });

  it('frees generated snapshots even when decoding an unexpected interaction kind fails', async () => {
    const interactionSnapshotFree = vi.fn();
    const module = await initializeHubCore(async () => ({
      hub_core_api_version: () => 1,
      hub_core_project_name: () => 'ha.ggis Hub',
      create_demo_world: () => ({
        tick_player: () => ({
          x: () => 0,
          y: () => 0,
          half_extent: () => 0,
          speed_per_tick: () => 0,
          free: vi.fn()
        }),
        interaction_for: () => ({
          kind: () => 99,
          id: () => '',
          title: () => '',
          free: interactionSnapshotFree
        })
      })
    }));

    expect(() => module.world.interactionFor({ x: 0, y: 0, halfExtent: 0, speedPerTick: 0 })).toThrow(
      'Unknown hub interaction kind from WASM: 99'
    );
    expect(interactionSnapshotFree).toHaveBeenCalledOnce();
  });

  it('fails cleanly when the generated module cannot load', async () => {
    await expect(initializeHubCore(async () => {
      throw new Error('network unavailable');
    })).rejects.toMatchObject({
      name: 'HubWasmInitializationError',
      message: 'Unable to initialize ha.ggis Hub core WASM module'
    });
  });
});
