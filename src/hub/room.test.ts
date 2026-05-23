import { describe, expect, it, vi } from 'vitest';
import { createHubRoomController } from './room';
import type { HubBoundary, RoomDefinition } from '../wasm/boundary';
import type { DecodedSnapshot } from '../wasm/snapshot-codec';

function emptyRoom(): RoomDefinition {
  return { worldWidth: 1_000, worldHeight: 1_000, doors: [] };
}

function snapshotAt(x: number, y: number): DecodedSnapshot {
  return {
    playerX: x,
    playerY: y,
    playerHalfExtent: 80,
    worldWidth: 1_000,
    worldHeight: 1_000,
    interactionKind: 'none',
    interactionDoorIndex: 0,
    doors: []
  };
}

interface StubBoundaryHandle {
  readonly boundary: HubBoundary;
  readonly tick: ReturnType<typeof vi.fn>;
  readonly destroy: ReturnType<typeof vi.fn>;
  setNext(snapshot: DecodedSnapshot): void;
}

function makeStubBoundary(initial: DecodedSnapshot): StubBoundaryHandle {
  let nextSnapshot = initial;
  const tick = vi.fn((_inputPacked: number): DecodedSnapshot => nextSnapshot);
  const destroy = vi.fn();
  const boundary: HubBoundary = {
    apiVersion: 1,
    room: emptyRoom(),
    tick,
    stateHash: () => 0n,
    destroy
  };
  return {
    boundary,
    tick,
    destroy,
    setNext(snapshot: DecodedSnapshot): void {
      nextSnapshot = snapshot;
    }
  };
}

describe('createHubRoomController', () => {
  it('draws the initial frame by ticking the boundary once on construction', () => {
    const initial = snapshotAt(500, 500);
    const stub = makeStubBoundary(initial);
    const render = vi.fn();

    const controller = createHubRoomController({
      boundary: stub.boundary,
      renderer: { render },
      input: { packedInput: () => 0 }
    });

    // Constructor invoked tick once with a zero input to seed the first snapshot.
    expect(stub.tick).toHaveBeenCalledTimes(1);
    expect(stub.tick).toHaveBeenCalledWith(0);
    expect(controller.lastSnapshot()).toBe(initial);
    // render() is not implicitly called on construction — the host pulls it.
    expect(render).not.toHaveBeenCalled();
  });

  it('advances the snapshot through the boundary on each tick and renders it', () => {
    const initial = snapshotAt(500, 500);
    const moved = snapshotAt(600, 500);
    const stub = makeStubBoundary(initial);
    const render = vi.fn();
    const packedInput = vi.fn(() => 0b0001); // x = +1

    const controller = createHubRoomController({
      boundary: stub.boundary,
      renderer: { render },
      input: { packedInput }
    });

    stub.setNext(moved);
    controller.tick();

    expect(packedInput).toHaveBeenCalledTimes(1);
    // Tick called twice total: once by constructor, once by the controller.tick().
    expect(stub.tick).toHaveBeenCalledTimes(2);
    expect(stub.tick).toHaveBeenLastCalledWith(0b0001);
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(moved);
    expect(controller.lastSnapshot()).toBe(moved);
  });

  it('renders the last snapshot when render() is called without advancing the boundary', () => {
    const initial = snapshotAt(500, 500);
    const stub = makeStubBoundary(initial);
    const render = vi.fn();

    const controller = createHubRoomController({
      boundary: stub.boundary,
      renderer: { render },
      input: { packedInput: () => 0 }
    });

    controller.render();

    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(initial);
    // No new boundary ticks beyond construction.
    expect(stub.tick).toHaveBeenCalledTimes(1);
  });

  it('releases the underlying boundary on destroy()', () => {
    const stub = makeStubBoundary(snapshotAt(500, 500));

    const controller = createHubRoomController({
      boundary: stub.boundary,
      renderer: { render: vi.fn() },
      input: { packedInput: () => 0 }
    });

    controller.destroy();

    expect(stub.destroy).toHaveBeenCalledTimes(1);
  });
});
