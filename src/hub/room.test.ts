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
    doors: [],
  };
}

interface StubBoundaryHandle {
  readonly boundary: HubBoundary;
  readonly snapshot: ReturnType<typeof vi.fn>;
  readonly tick: ReturnType<typeof vi.fn>;
  readonly destroy: ReturnType<typeof vi.fn>;
  setNext(snapshot: DecodedSnapshot): void;
}

function makeStubBoundary(initial: DecodedSnapshot): StubBoundaryHandle {
  let nextSnapshot = initial;
  const snapshot = vi.fn((): DecodedSnapshot => initial);
  const tick = vi.fn((_inputPacked: number): DecodedSnapshot => nextSnapshot);
  const destroy = vi.fn();
  const boundary: HubBoundary = {
    apiVersion: 1,
    room: emptyRoom(),
    snapshot,
    tick,
    stateHash: () => 0n,
    destroy,
  };
  return {
    boundary,
    snapshot,
    tick,
    destroy,
    setNext(next: DecodedSnapshot): void {
      nextSnapshot = next;
    },
  };
}

describe('createHubRoomController', () => {
  it('seeds the initial snapshot via boundary.snapshot() without advancing the sim', () => {
    const initial = snapshotAt(500, 500);
    const stub = makeStubBoundary(initial);
    const render = vi.fn();

    const controller = createHubRoomController({
      boundary: stub.boundary,
      renderer: { render },
    });

    expect(stub.snapshot).toHaveBeenCalledTimes(1);
    expect(stub.tick).not.toHaveBeenCalled();
    expect(controller.lastSnapshot()).toBe(initial);
    expect(render).not.toHaveBeenCalled();
  });

  it('advances the snapshot through the boundary on each tick and renders it', () => {
    const initial = snapshotAt(500, 500);
    const moved = snapshotAt(600, 500);
    const stub = makeStubBoundary(initial);
    const render = vi.fn();

    const controller = createHubRoomController({
      boundary: stub.boundary,
      renderer: { render },
    });

    stub.setNext(moved);
    controller.tick(0b0001); // x = +1

    expect(stub.tick).toHaveBeenCalledTimes(1);
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
    });

    controller.render();

    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(initial);
    expect(stub.tick).not.toHaveBeenCalled();
  });

  it('releases the underlying boundary on destroy()', () => {
    const stub = makeStubBoundary(snapshotAt(500, 500));

    const controller = createHubRoomController({
      boundary: stub.boundary,
      renderer: { render: vi.fn() },
    });

    controller.destroy();

    expect(stub.destroy).toHaveBeenCalledTimes(1);
  });
});
